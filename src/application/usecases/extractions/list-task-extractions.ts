import { TaskExtractionRepository } from '@/infra/db/repositories';
import { type TaskExtractionEntity } from '@/domain/entities';
import { objectIdSchema } from '@/shared/validation';

const listTaskExtractionsSchema = objectIdSchema;

export const listTaskExtractionsUseCase = async (
  taskId: string,
): Promise<TaskExtractionEntity[]> => {
  const input = listTaskExtractionsSchema.parse(taskId);
  return await TaskExtractionRepository.listByTaskId(input);
};
