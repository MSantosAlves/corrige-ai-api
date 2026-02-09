import { z } from 'zod';

import { TaskExtractionRepository } from '@/infra/db/repositories';
import { type TaskExtractionEntity } from '@/domain/entities';
import { assertTaskOwnedByUser } from '@/application/usecases/shared/ownership';
import { objectIdSchema } from '@/shared/validation';

const saveTaskExtractionSchema = z.object({
  userId: objectIdSchema,
  taskId: objectIdSchema,
  ocrExtractionResult: z.record(z.string(), z.unknown()),
  analysisResult: z.string(),
  filename: z.string().min(1),
});

export const saveTaskExtractionUseCase = async (data: {
  userId: string;
  taskId: string;
  ocrExtractionResult: Record<string, unknown>;
  analysisResult: string;
  filename: string;
}): Promise<TaskExtractionEntity> => {
  const input = saveTaskExtractionSchema.parse(data);
  await assertTaskOwnedByUser(input.taskId, input.userId);
  return await TaskExtractionRepository.create({
    taskId: input.taskId,
    ocrExtractionResult: input.ocrExtractionResult,
    analysisResult: input.analysisResult,
    filename: input.filename,
  });
};
