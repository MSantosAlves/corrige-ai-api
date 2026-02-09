import { OCRClient, type OCRAsyncJobStatus } from '@/infra/providers/ocr/ocr-client';
import {
  ClassRepository,
  TaskExtractionBatchRepository,
  TaskExtractionRepository,
  TaskRepository,
  UserRepository,
} from '@/infra/db/repositories';
import {
  TaskExtractionBatchStatuses,
  TaskExtractionStatuses,
  type TaskExtractionBatchStatus,
  type TaskExtractionEntity,
} from '@/domain/entities';
import { enqueueLlmAnalysis } from '@/infra/queues/llm-analysis-queue';
import { objectIdSchema } from '@/shared/validation';
import {
  buildBlockedExtractionResult,
  getOcrBlockingInfo,
  INVALID_CONTENT_PT_BR,
  MALICIOUS_CONTENT_PT_BR,
} from '@/application/usecases/ocr/ocr-blocking';

const ocrClientInstance = new OCRClient();

const pollSchema = objectIdSchema;

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
  blockedByOcr: boolean,
): 'PENDING' | 'TEXT_EXTRACTION' | 'TEXT_ANALYSIS' | 'DONE' | 'ERROR' => {
  if (blockedByOcr || status === 'FAILED' || status === 'CANCELED') {
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
    children.map(async (child) => {
      const blockingInfo = getOcrBlockingInfo(child.error ?? null);
      const analysisResult = blockingInfo.blockedByOcr
        ? blockingInfo.isMalicious
          ? MALICIOUS_CONTENT_PT_BR
          : INVALID_CONTENT_PT_BR
        : undefined;
      const ocrExtractionResult = blockingInfo.blockedByOcr
        ? buildBlockedExtractionResult({
            blockingInfo,
            rawError: child.error ?? null,
          })
        : (child.result ?? null);

      const updatedExtraction = await TaskExtractionRepository.updateByOcrResultId(child.job_id, {
        status: mapExtractionStatus(child.status, Boolean(child.result), blockingInfo.blockedByOcr),
        ocrExtractionResult,
        analysisResult,
      });

      if (updatedExtraction && blockingInfo.isMalicious) {
        const task = await TaskRepository.getById(updatedExtraction.taskId);
        if (task) {
          const classItem = await ClassRepository.getById(task.classId);
          if (classItem) {
            await UserRepository.blockByOcr({
              id: classItem.userId,
              extractionId: updatedExtraction.id,
              blockedCategory: blockingInfo.blockedCategory ?? 'malicious_content',
              blockedReason: blockingInfo.blockedReason ?? MALICIOUS_CONTENT_PT_BR,
            });
          }
        }
      }

      return updatedExtraction;
    }),
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
      item.status === TaskExtractionStatuses.DONE || item.status === TaskExtractionStatuses.ERROR,
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
