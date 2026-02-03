import { z } from 'zod';

import {
  TaskExtractionBatchRepository,
  TaskExtractionRepository,
} from '@/infra/db/repositories';
import { type TaskExtractionBatchStatus, type TaskExtractionEntity } from '@/domain/entities';

const getSchema = z.string().uuid();

export const getBulkTaskExtractionsUseCase = async (
  batchId: string,
): Promise<{
  batchId: string;
  ocrJobId: string;
  status: TaskExtractionBatchStatus;
  items: TaskExtractionEntity[];
}> => {
  const input = getSchema.parse(batchId);
  const batch = await TaskExtractionBatchRepository.getById(input);
  if (!batch) {
    throw new Error('Lote de extrações não encontrado.');
  }

  const items = await TaskExtractionRepository.listByBatchId(batch.id);
  const totalCount = items.length;
  const completedCount = items.filter(
    (item) => item.status === 'done' || item.status === 'error',
  ).length;
  const pipelineStatus =
    totalCount > 0 && completedCount === totalCount ? 'done' : 'processing';

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
