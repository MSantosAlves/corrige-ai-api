import { z } from 'zod';

import { OCRClient, type OCRAsyncJobStatus } from '@/infra/providers/ocr/ocr-client';
import { TaskExtractionBatchRepository, TaskExtractionRepository } from '@/infra/db/repositories';
import { type TaskExtractionBatchStatus, type TaskExtractionEntity } from '@/domain/entities';
import { enqueueLlmAnalysis } from '@/infra/queues/llm-analysis-queue';

const ocrClientInstance = new OCRClient();

const pollSchema = z.string().uuid();

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
  hasResult: boolean,
): 'pending' | 'ocr_finished' | 'analysing' | 'done' | 'error' => {
  if (status === 'FAILED' || status === 'CANCELED') {
    return 'error';
  }
  if (hasResult) {
    return 'ocr_finished';
  }
  return 'pending';
};

export const pollBulkTaskExtractionsUseCase = async (
  batchId: string,
): Promise<{
  batchId: string;
  ocrJobId: string;
  status: TaskExtractionBatchStatus;
  items: TaskExtractionEntity[];
}> => {
  const input = pollSchema.parse(batchId);
  const batch = await TaskExtractionBatchRepository.getById(input);
  if (!batch) {
    throw new Error('Lote de extrações não encontrado.');
  }

  const jobStatus = await ocrClientInstance.getJobStatus(batch.ocrJobId);
  const ocrBatchStatus = mapBatchStatus(jobStatus.status);

  const children = jobStatus.children ?? [];
  const updatedExtractions = await Promise.all(
    children.map((child) =>
      TaskExtractionRepository.updateByOcrResultId(child.job_id, {
        status: mapExtractionStatus(child.status, Boolean(child.result)),
        ocrExtractionResult: child.result ?? null,
      }),
    ),
  );

  await Promise.all(
    updatedExtractions
      .filter(
        (extraction): extraction is TaskExtractionEntity =>
          extraction !== null &&
          extraction.status === 'ocr_finished' &&
          Boolean(extraction.ocrExtractionResult) &&
          !extraction.analysisResult,
      )
      .map((extraction) => enqueueLlmAnalysis(extraction.id)),
  );

  const items = await TaskExtractionRepository.listByBatchId(batch.id);
  const totalCount = items.length;
  const completedCount = items.filter(
    (item) => item.status === 'done' || item.status === 'error',
  ).length;
  const pipelineStatus =
    totalCount === 0
      ? ocrBatchStatus
      : completedCount === totalCount
        ? 'done'
        : 'processing';

  if (pipelineStatus !== batch.status) {
    await TaskExtractionBatchRepository.updateStatus(batch.id, pipelineStatus);
  }

  return {
    batchId: batch.id,
    ocrJobId: batch.ocrJobId,
    status: pipelineStatus,
    items,
  };
};
