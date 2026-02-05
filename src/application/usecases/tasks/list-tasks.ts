import { TaskRepository } from '@/infra/db/repositories';
import { type TaskEntity } from '@/domain/entities';
import { objectIdSchema } from '@/shared/validation';

const listTasksSchema = objectIdSchema;

export const listTasksUseCase = async (classId: string): Promise<TaskEntity[]> => {
  const input = listTasksSchema.parse(classId);
  return await TaskRepository.listByClassId(input);
};
