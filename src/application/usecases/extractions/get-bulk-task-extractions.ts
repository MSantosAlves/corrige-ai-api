import { z } from 'zod';

import {
  TaskExtractionBatchRepository,
  TaskExtractionRepository,
  UserRepository,
} from '@/infra/db/repositories';
import {
  TaskExtractionBatchStatuses,
  TaskExtractionStatuses,
  type TaskExtractionBatchStatus,
  type TaskExtractionEntity,
} from '@/domain/entities';
import { assertBatchOwnedByUser } from '@/application/usecases/shared/ownership';
import { objectIdSchema } from '@/shared/validation';

const getSchema = z.object({
  batchId: objectIdSchema,
  userId: objectIdSchema,
});

export const getBulkTaskExtractionsUseCase = async (data: {
  batchId: string;
  userId: string;
}): Promise<{
  batchId: string;
  ocrJobId: string;
  status: TaskExtractionBatchStatus;
  items: TaskExtractionEntity[];
  user: {
    isBlocked: boolean;
    blockInfo: Record<string, unknown> | null;
  };
}> => {
  const input = getSchema.parse(data);
  const batch = await assertBatchOwnedByUser(input.batchId, input.userId);

  const items = await TaskExtractionRepository.listByBatchId(batch.id);
  const totalCount = items.length;
  const completedCount = items.filter(
    (item) =>
      item.status === TaskExtractionStatuses.DONE || item.status === TaskExtractionStatuses.ERROR,
  ).length;
  const pipelineStatus =
    totalCount === 0
      ? batch.status
      : completedCount === totalCount
        ? TaskExtractionBatchStatuses.DONE
        : TaskExtractionBatchStatuses.PROCESSING;

  if (pipelineStatus !== batch.status) {
    await TaskExtractionBatchRepository.updateStatus(batch.id, pipelineStatus);
  }
  const user = await UserRepository.findById(input.userId);
  if (!user) {
    throw new Error('Usuário não encontrado.');
  }

  return {
    batchId: batch.id,
    ocrJobId: batch.ocrJobId,
    status: pipelineStatus,
    items,
    user: {
      isBlocked: user.isBlocked,
      blockInfo: user.blockInfo,
    },
  };
};
