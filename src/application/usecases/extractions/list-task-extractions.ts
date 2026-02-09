import { z } from 'zod';

import { TaskExtractionRepository } from '@/infra/db/repositories';
import { type TaskExtractionEntity } from '@/domain/entities';
import { assertTaskOwnedByUser } from '@/application/usecases/shared/ownership';
import { objectIdSchema } from '@/shared/validation';

const listTaskExtractionsSchema = z.object({
  taskId: objectIdSchema,
  userId: objectIdSchema,
});

export const listTaskExtractionsUseCase = async (data: {
  taskId: string;
  userId: string;
}): Promise<TaskExtractionEntity[]> => {
  const input = listTaskExtractionsSchema.parse(data);
  await assertTaskOwnedByUser(input.taskId, input.userId);
  return await TaskExtractionRepository.listByTaskId(input.taskId);
};
