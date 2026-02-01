import { z } from "zod";

import { ClassRepository, type ClassEntity } from "../../repositories";

const listClassesSchema = z.string().uuid();

export const listClassesUseCase = async (
  userId: string
): Promise<ClassEntity[]> => {
  const input = listClassesSchema.parse(userId);
  return await ClassRepository.listByUserId(input);
};
