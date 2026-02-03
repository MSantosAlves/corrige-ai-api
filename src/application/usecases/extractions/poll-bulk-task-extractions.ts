import { z } from 'zod';

import { OCRClient, type OCRAsyncJobStatus } from '@/infra/providers/ocr/ocr-client';
import { TaskExtractionBatchRepository, TaskExtractionRepository } from '@/infra/db/repositories';
import {
  TaskExtractionBatchStatuses,
  TaskExtractionStatuses,
  type TaskExtractionBatchStatus,
  type TaskExtractionEntity,
} from '@/domain/entities';
import { enqueueLlmAnalysis } from '@/infra/queues/llm-analysis-queue';

const ocrClientInstance = new OCRClient();

const pollSchema = z.string().uuid();

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
  hasResult: boolean,
): 'PENDING' | 'TEXT_EXTRACTION' | 'TEXT_ANALYSIS' | 'DONE' | 'ERROR' => {
  if (status === 'FAILED' || status === 'CANCELED') {
    return TaskExtractionStatuses.ERROR;
  }
  if (hasResult) {
    return TaskExtractionStatuses.TEXT_EXTRACTION;
  }
  return TaskExtractionStatuses.PENDING;
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
          extraction.status === TaskExtractionStatuses.TEXT_EXTRACTION &&
          Boolean(extraction.ocrExtractionResult) &&
          !extraction.analysisResult,
      )
      .map((extraction) => enqueueLlmAnalysis(extraction.id)),
  );

  const items = await TaskExtractionRepository.listByBatchId(batch.id);
  const totalCount = items.length;
  const completedCount = items.filter(
    (item) =>
      item.status === TaskExtractionStatuses.DONE ||
      item.status === TaskExtractionStatuses.ERROR,
  ).length;
  const pipelineStatus =
    totalCount === 0
      ? ocrBatchStatus
      : completedCount === totalCount
        ? TaskExtractionBatchStatuses.DONE
        : TaskExtractionBatchStatuses.PROCESSING;

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
