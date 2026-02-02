import { z } from 'zod';

import { TaskExtractionRepository } from '@/infra/db/repositories';
import { type TaskExtractionEntity } from '@/domain/entities';

const listTaskExtractionsSchema = z.string().uuid();

export const listTaskExtractionsUseCase = async (
  taskId: string,
): Promise<TaskExtractionEntity[]> => {
  const input = listTaskExtractionsSchema.parse(taskId);
  return await TaskExtractionRepository.listByTaskId(input);
};
