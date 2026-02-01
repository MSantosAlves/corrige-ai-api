import { z } from "zod";

import {
  TaskExtraction,
  taskExtractionRepository
} from "../../repositories";

const saveTaskExtractionSchema = z.object({
  taskId: z.string().uuid(),
  ocrExtractionResult: z.record(z.string(), z.unknown()),
  analysisResult: z.string(),
  filename: z.string().min(1)
});

export const saveTaskExtractionUseCase = async (data: {
  taskId: string;
  ocrExtractionResult: Record<string, unknown>;
  analysisResult: string;
  filename: string;
}): Promise<TaskExtraction> => {
  const input = saveTaskExtractionSchema.parse(data);
  return await taskExtractionRepository.create(input);
};
