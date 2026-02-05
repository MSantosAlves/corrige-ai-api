import { z } from 'zod';

import { ClassRepository } from '@/infra/db/repositories';
import { type ClassEntity } from '@/domain/entities';
import { objectIdSchema } from '@/shared/validation';

const createClassSchema = z.object({
  name: z.string().min(1).max(255),
  userId: objectIdSchema,
});

export const createClassUseCase = async (data: {
  name: string;
  userId: string;
}): Promise<ClassEntity> => {
  const input = createClassSchema.parse(data);
  return await ClassRepository.create({ name: input.name, userId: input.userId });
};
