import { z } from 'zod';

import { TaskExtractionRepository } from '@/infra/db/repositories';
import { type TaskExtractionEntity } from '@/domain/entities';
import { objectIdSchema } from '@/shared/validation';

const saveTaskExtractionSchema = z.object({
  taskId: objectIdSchema,
  ocrExtractionResult: z.record(z.string(), z.unknown()),
  analysisResult: z.string(),
  filename: z.string().min(1),
});

export const saveTaskExtractionUseCase = async (data: {
  taskId: string;
  ocrExtractionResult: Record<string, unknown>;
  analysisResult: string;
  filename: string;
}): Promise<TaskExtractionEntity> => {
  const input = saveTaskExtractionSchema.parse(data);
  return await TaskExtractionRepository.create(input);
};
