import { z } from 'zod';

import { ClassRepository, ClassEntity } from '../../repositories';

const createClassSchema = z.object({
  name: z.string().min(1).max(255),
  userId: z.string().uuid(),
});

export const createClassUseCase = async (data: {
  name: string;
  userId: string;
}): Promise<ClassEntity> => {
  const input = createClassSchema.parse(data);
  return await ClassRepository.create({ name: input.name, userId: input.userId });
};
