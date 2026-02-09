import { z } from 'zod';

import { TaskRepository } from '@/infra/db/repositories';
import { type TaskEntity } from '@/domain/entities';
import { assertClassOwnedByUser } from '@/application/usecases/shared/ownership';
import { objectIdSchema } from '@/shared/validation';

const listTasksSchema = z.object({
  classId: objectIdSchema,
  userId: objectIdSchema,
});

export const listTasksUseCase = async (data: {
  classId: string;
  userId: string;
}): Promise<TaskEntity[]> => {
  const input = listTasksSchema.parse(data);
  await assertClassOwnedByUser(input.classId, input.userId);
  return await TaskRepository.listByClassId(input.classId);
};
