import { z } from 'zod';

import { TaskRepository } from '@/infra/db/repositories';
import { type TaskEntity } from '@/domain/entities';
import { objectIdSchema } from '@/shared/validation';

const createTaskSchema = z.object({
  classId: objectIdSchema,
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
});

export const createTaskUseCase = async (data: {
  classId: string;
  title: string;
  description?: string;
}): Promise<TaskEntity> => {
  const input = createTaskSchema.parse(data);
  return await TaskRepository.create({
    ...input,
    description: input.description?.trim() || undefined,
  });
};
