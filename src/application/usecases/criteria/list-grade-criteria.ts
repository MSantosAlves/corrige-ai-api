import { z } from 'zod';

import {
  GradeCriteriaClassifications,
  type GradeCriteriaClassification,
  type GradeCriteriaEntity,
} from '@/domain/entities';
import { GradeCriteriaRepository } from '@/infra/db/repositories';
import { objectIdSchema } from '@/shared/validation';

const listCriteriaSchema = z.object({
  classification: z.nativeEnum(GradeCriteriaClassifications).optional(),
  userId: objectIdSchema.optional(),
  includePublic: z.boolean().optional(),
});

export const listGradeCriteriaUseCase = async (filters: {
  classification?: GradeCriteriaClassification;
  userId?: string;
  includePublic?: boolean;
}): Promise<GradeCriteriaEntity[]> => {
  const input = listCriteriaSchema.parse(filters);
  const includePublic = input.includePublic ?? true;
  return await GradeCriteriaRepository.list({
    classification: input.classification,
    userId: input.userId,
    includePublic,
  });
};
