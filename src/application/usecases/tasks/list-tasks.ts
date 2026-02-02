import { z } from 'zod';

import { TaskRepository } from '@/infra/db/repositories';
import { type TaskEntity } from '@/domain/entities';

const listTasksSchema = z.string().uuid();

export const listTasksUseCase = async (classId: string): Promise<TaskEntity[]> => {
  const input = listTasksSchema.parse(classId);
  return await TaskRepository.listByClassId(input);
};
