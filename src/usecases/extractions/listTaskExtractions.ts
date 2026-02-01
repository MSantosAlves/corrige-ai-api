import { z } from "zod";

import {
  TaskExtraction,
  taskExtractionRepository
} from "../../repositories";

const listTaskExtractionsSchema = z.string().uuid();

export const listTaskExtractionsUseCase = async (
  taskId: string
): Promise<TaskExtraction[]> => {
  const input = listTaskExtractionsSchema.parse(taskId);
  return await taskExtractionRepository.listByTaskId(input);
};
