import { z } from 'zod';

import { ClassRepository } from '@/infra/db/repositories';
import { type ClassEntity } from '@/domain/entities';

const listClassesSchema = z.string().uuid();

export const listClassesUseCase = async (userId: string): Promise<ClassEntity[]> => {
  const input = listClassesSchema.parse(userId);
  return await ClassRepository.listByUserId(input);
};
