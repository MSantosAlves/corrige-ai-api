import { z } from 'zod';

import { TaskExtractionRepository } from '@/infra/db/repositories';
import { type TaskExtractionEntity } from '@/domain/entities';
import { assertTaskOwnedByUser } from '@/application/usecases/shared/ownership';
import { objectIdSchema } from '@/shared/validation';

const getTaskExtractionSchema = z.object({
  id: objectIdSchema,
  userId: objectIdSchema,
});

export const getTaskExtractionUseCase = async (data: {
  id: string;
  userId: string;
}): Promise<TaskExtractionEntity | null> => {
  const input = getTaskExtractionSchema.parse(data);
  const extraction = await TaskExtractionRepository.getById(input.id);
  if (!extraction) {
    return null;
  }

  await assertTaskOwnedByUser(extraction.taskId, input.userId);
  return extraction;
};
