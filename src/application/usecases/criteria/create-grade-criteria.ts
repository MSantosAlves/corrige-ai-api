import { z } from 'zod';

import {
  GradeCriteriaClassifications,
  type GradeCriteriaClassification,
  type GradeCriteriaItem,
  type GradeCriteriaEntity,
} from '@/domain/entities';
import { GradeCriteriaRepository } from '@/infra/db/repositories';
import { objectIdSchema } from '@/shared/validation';

const gradeCriteriaItemSchema = z.object({
  label: z.string().min(1).max(200),
  weight: z.number().min(0),
  description: z.string().max(500).optional(),
});

const createCriteriaSchema = z.object({
  userId: objectIdSchema,
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  classification: z.nativeEnum(GradeCriteriaClassifications),
  isPublic: z.boolean(),
  maxScore: z.number().min(0),
  items: z.array(gradeCriteriaItemSchema).min(1),
  tags: z.array(z.string().min(1).max(50)).optional(),
});

export const createGradeCriteriaUseCase = async (data: {
  userId: string;
  name: string;
  description?: string;
  classification: GradeCriteriaClassification;
  isPublic: boolean;
  maxScore: number;
  items: GradeCriteriaItem[];
  tags?: string[];
}): Promise<GradeCriteriaEntity> => {
  const input = createCriteriaSchema.parse(data);
  return await GradeCriteriaRepository.create({
    ...input,
    description: input.description?.trim() || undefined,
    tags: input.tags?.map((tag) => tag.trim()).filter(Boolean),
  });
};
