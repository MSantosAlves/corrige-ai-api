import { z } from 'zod';

import {
  OCRClient,
  type OCRAsyncJobStatus,
  type OCRDocumentType,
} from '@/infra/providers/ocr/ocr-client';
import { TaskExtractionBatchRepository, TaskExtractionRepository } from '@/infra/db/repositories';
import { enqueueBulkExtractionPoll } from '@/infra/queues/bulk-extraction-queue';
import { type TaskExtractionBatchStatus, type TaskExtractionEntity } from '@/domain/entities';

const ocrClientInstance = new OCRClient();

const bulkRequestSchema = z.object({
  taskId: z.uuid(),
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
    return 'error';
  }
  if (status === 'SUCCESS' || status === 'PARTIAL_SUCCESS') {
    return 'done';
  }
  if (status === 'STARTED') {
    return 'processing';
  }
  return 'pending';
};

const mapExtractionStatus = (
  status: OCRAsyncJobStatus,
): 'pending' | 'ocr_finished' | 'analysing' | 'done' | 'error' => {
  if (status === 'FAILED' || status === 'CANCELED') {
    return 'error';
  }
  if (status === 'SUCCESS' || status === 'PARTIAL_SUCCESS') {
    return 'ocr_finished';
  }
  return 'pending';
};

export const createBulkTaskExtractionsUseCase = async (data: {
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
}> => {
  const input = bulkRequestSchema.parse(data);
  const files = bulkFilesSchema.parse(data.files);

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

  return {
    batchId: batch.id,
    ocrJobId: batch.ocrJobId,
    status: batch.status,
    items,
  };
};
