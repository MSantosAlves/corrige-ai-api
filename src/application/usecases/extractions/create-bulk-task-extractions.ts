import { z } from 'zod';

import {
  OCRClient,
  type OCRAsyncJobStatus,
  type OCRDocumentType,
} from '@/infra/providers/ocr/ocr-client';
import {
  TaskExtractionBatchRepository,
  TaskExtractionRepository,
  ClassRepository,
  TaskRepository,
  UserRepository,
} from '@/infra/db/repositories';
import { enqueueBulkExtractionPoll } from '@/infra/queues/bulk-extraction-queue';
import {
  TaskExtractionBatchStatuses,
  TaskExtractionStatuses,
  type TaskExtractionBatchStatus,
  type TaskExtractionEntity,
} from '@/domain/entities';
import { assertTaskOwnedByUser } from '@/application/usecases/shared/ownership';
import { objectIdSchema } from '@/shared/validation';
import {
  buildBlockedExtractionResult,
  getOcrBlockingInfo,
  INVALID_CONTENT_PT_BR,
  MALICIOUS_CONTENT_PT_BR,
} from '@/application/usecases/ocr/ocr-blocking';

const ocrClientInstance = new OCRClient();

const bulkRequestSchema = z.object({
  taskId: objectIdSchema,
  documentType: z.enum(['pdf_native', 'printed', 'handwritten', 'auto']).optional(),
  language: z.string().optional(),
  preserveLayout: z.boolean().optional(),
  qualityThreshold: z.number().min(0).max(1).optional(),
});

const bulkFileSchema = z.object({
  originalname: z.string().min(1),
  buffer: z.instanceof(Buffer),
});

const bulkFilesSchema = z.array(bulkFileSchema).min(1);

const mapBatchStatus = (status: OCRAsyncJobStatus): TaskExtractionBatchStatus => {
  if (status === 'FAILED' || status === 'CANCELED') {
    return TaskExtractionBatchStatuses.ERROR;
  }
  if (status === 'SUCCESS' || status === 'PARTIAL_SUCCESS') {
    return TaskExtractionBatchStatuses.DONE;
  }
  if (status === 'STARTED') {
    return TaskExtractionBatchStatuses.PROCESSING;
  }
  return TaskExtractionBatchStatuses.PENDING;
};

const mapExtractionStatus = (
  status: OCRAsyncJobStatus,
): 'PENDING' | 'TEXT_EXTRACTION' | 'TEXT_ANALYSIS' | 'DONE' | 'ERROR' => {
  if (status === 'FAILED' || status === 'CANCELED') {
    return TaskExtractionStatuses.ERROR;
  }
  if (status === 'SUCCESS' || status === 'PARTIAL_SUCCESS') {
    return TaskExtractionStatuses.TEXT_EXTRACTION;
  }
  return TaskExtractionStatuses.PENDING;
};

export const createBulkTaskExtractionsUseCase = async (data: {
  userId: string;
  taskId: string;
  files: Array<{ originalname: string; buffer: Buffer }>;
  documentType?: OCRDocumentType;
  language?: string;
  preserveLayout?: boolean;
  qualityThreshold?: number;
}): Promise<{
  batchId: string;
  ocrJobId: string;
  status: TaskExtractionBatchStatus;
  items: TaskExtractionEntity[];
  planUsage: number;
  planQuota: number;
  user: {
    isBlocked: boolean;
    blockInfo: Record<string, unknown> | null;
  };
}> => {
  const userId = data.userId;
  const input = bulkRequestSchema.parse(data);
  const files = bulkFilesSchema.parse(data.files);

  await assertTaskOwnedByUser(input.taskId, userId);
  await UserRepository.assertNotBlocked(userId);
  let reservedQuota = false;
  let planUsage = 0;
  let planQuota = 0;
  let userBlockState: { isBlocked: boolean; blockInfo: Record<string, unknown> | null } = {
    isBlocked: false,
    blockInfo: null,
  };

  try {
    const reservedUser = await UserRepository.reservePlanUsage({
      id: userId,
      amount: files.length,
    });
    reservedQuota = true;
    planUsage = reservedUser.planUsage;
    planQuota = reservedUser.planQuota;
    userBlockState = {
      isBlocked: reservedUser.isBlocked,
      blockInfo: reservedUser.blockInfo,
    };

    const ocrResponse = await ocrClientInstance.extractAsyncBulk(
      files.map((file) => ({ fileName: file.originalname, data: file.buffer })),
      {
        documentType: input.documentType as OCRDocumentType,
        language: input.language,
        preserveLayout: input.preserveLayout,
        qualityThreshold: input.qualityThreshold,
      },
    );

    const batch = await TaskExtractionBatchRepository.create({
      taskId: input.taskId,
      ocrJobId: ocrResponse.parent_job_id,
      status: mapBatchStatus(ocrResponse.status),
    });

    await enqueueBulkExtractionPoll(batch.id);

    const children = ocrResponse.children ?? [];
    const task = await TaskRepository.getById(input.taskId);
    const classItem = task ? await ClassRepository.getById(task.classId) : null;
    const items = await Promise.all(
      files.map((file) => {
        const child = children.find((entry) => entry.filename === file.originalname);
        const blockingInfo = getOcrBlockingInfo(child?.error ?? null);
        const isBlockedByOcr = blockingInfo.blockedByOcr;
        const shouldMarkAsError =
          isBlockedByOcr || child?.status === 'FAILED' || child?.status === 'CANCELED';
        const blockedResult =
          isBlockedByOcr && child?.error
            ? buildBlockedExtractionResult({
                blockingInfo,
                rawError: child.error,
              })
            : null;
        const analysisResult =
          isBlockedByOcr && blockingInfo.isMalicious
            ? MALICIOUS_CONTENT_PT_BR
            : isBlockedByOcr
              ? INVALID_CONTENT_PT_BR
              : null;
        return TaskExtractionRepository.create({
          taskId: input.taskId,
          filename: file.originalname,
          batchId: batch.id,
          status: shouldMarkAsError
            ? TaskExtractionStatuses.ERROR
            : mapExtractionStatus(child?.status ?? ocrResponse.status),
          ocrResultId: child?.job_id ?? null,
          ocrExtractionResult: blockedResult ?? child?.result ?? null,
          analysisResult,
        });
      }),
    );

    if (classItem && classItem.userId) {
      const maliciousItems = items.filter((item) => {
        const ocrResult = item.ocrExtractionResult;
        if (!ocrResult || typeof ocrResult !== 'object') {
          return false;
        }
        const blockedCategory = (ocrResult as Record<string, unknown>).blocked_category;
        return blockedCategory === 'malicious_content';
      });
      await Promise.all(
        maliciousItems.map((item) =>
          UserRepository.blockByOcr({
            id: classItem.userId,
            extractionId: item.id,
            blockedCategory: 'malicious_content',
            blockedReason: MALICIOUS_CONTENT_PT_BR,
          }),
        ),
      );
      if (maliciousItems.length > 0) {
        userBlockState = {
          isBlocked: true,
          blockInfo: {
            extractionId: maliciousItems[0].id,
            blockedCategory: 'malicious_content',
            blockedReason: MALICIOUS_CONTENT_PT_BR,
            blockedAt: new Date().toISOString(),
          },
        };
      }
    }

    return {
      batchId: batch.id,
      ocrJobId: batch.ocrJobId,
      status: batch.status,
      items,
      planUsage,
      planQuota,
      user: userBlockState,
    };
  } catch (error) {
    if (reservedQuota) {
      try {
        await UserRepository.rollbackPlanUsage({ id: userId, amount: files.length });
      } catch (rollbackError) {
        console.error('Erro ao reverter consumo de plano após falha em lote.', rollbackError);
      }
    }
    throw error;
  }
};
