import { z } from 'zod';

import { TaskRepository } from '@/infra/db/repositories';
import { type TaskEntity } from '@/domain/entities';
import { assertClassOwnedByUser } from '@/application/usecases/shared/ownership';
import { objectIdSchema } from '@/shared/validation';

const createTaskSchema = z.object({
  userId: objectIdSchema,
  classId: objectIdSchema,
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
});

export const createTaskUseCase = async (data: {
  userId: string;
  classId: string;
  title: string;
  description?: string;
}): Promise<TaskEntity> => {
  const input = createTaskSchema.parse(data);
  await assertClassOwnedByUser(input.classId, input.userId);
  return await TaskRepository.create({
    classId: input.classId,
    title: input.title,
    description: input.description?.trim() || undefined,
  });
};
