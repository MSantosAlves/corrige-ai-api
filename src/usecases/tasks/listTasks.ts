import { z } from "zod";

import { TaskRepository, type TaskEntity } from "../../repositories";

const listTasksSchema = z.string().uuid();

export const listTasksUseCase = async (
  classId: string
): Promise<TaskEntity[]> => {
  const input = listTasksSchema.parse(classId);
  return await TaskRepository.listByClassId(input);
};
