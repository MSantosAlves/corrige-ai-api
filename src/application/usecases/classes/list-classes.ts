import { ClassRepository } from '@/infra/db/repositories';
import { type ClassEntity } from '@/domain/entities';
import { objectIdSchema } from '@/shared/validation';

const listClassesSchema = objectIdSchema;

export const listClassesUseCase = async (userId: string): Promise<ClassEntity[]> => {
  const input = listClassesSchema.parse(userId);
  return await ClassRepository.listByUserId(input);
};
