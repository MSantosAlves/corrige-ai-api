import { z } from 'zod';

import {
  OCRClient,
  type OCRAsyncJobStatus,
  type OCRDocumentType,
} from '@/infra/providers/ocr/ocr-client';
import {
  TaskExtractionBatchRepository,
  TaskExtractionRepository,
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
}> => {
  const userId = data.userId;
  const input = bulkRequestSchema.parse(data);
  const files = bulkFilesSchema.parse(data.files);

  const user = await UserRepository.findById(userId);
  if (!user) {
    throw new Error('Usuário não encontrado.');
  }
  await assertTaskOwnedByUser(input.taskId, userId);
  if (user.planUsage + files.length > user.planQuota) {
    const remainingQuota = user.planQuota - user.planUsage;
    const errorMessage =
      remainingQuota > 0
        ? `Você possui apenas ${remainingQuota} correções restantes. Por favor, diminua o número de arquivos ou faça upgrade do seu plano para continuar.`
        : 'Você atingiu o limite mensal de uso do seu plano. Por favor, faça um upgrade para continuar.';
    throw new Error(errorMessage);
  }

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
  const items = await Promise.all(
    files.map((file) => {
      const child = children.find((entry) => entry.filename === file.originalname);
      return TaskExtractionRepository.create({
        taskId: input.taskId,
        filename: file.originalname,
        batchId: batch.id,
        status: mapExtractionStatus(child?.status ?? ocrResponse.status),
        ocrResultId: child?.job_id ?? null,
        ocrExtractionResult: child?.result ?? null,
        analysisResult: null,
      });
    }),
  );

  const updatedUser = await UserRepository.incrementPlanUsage({
    id: userId,
    amount: files.length,
  });

  return {
    batchId: batch.id,
    ocrJobId: batch.ocrJobId,
    status: batch.status,
    items,
    planUsage: updatedUser.planUsage,
    planQuota: updatedUser.planQuota,
  };
};
