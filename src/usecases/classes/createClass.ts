import { z } from "zod";

import { classRepository, type classEntity } from "../../repositories/classRepository";

const createClassSchema = z.object({
  name: z.string().min(1).max(255),
  userId: z.string().uuid()
});

export const createClassUseCase = async (data: {
  name: string;
  userId: string;
}): Promise<classEntity> => {
  const input = createClassSchema.parse(data);
  return await classRepository.create({ name: input.name, userId: input.userId });
};
