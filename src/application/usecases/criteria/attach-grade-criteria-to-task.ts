import { z } from 'zod';

import { GradeCriteriaRepository, TaskRepository } from '@/infra/db/repositories';
import { type GradeCriteriaClassification, type TaskEntity } from '@/domain/entities';
import { assertTaskOwnedByUser } from '@/application/usecases/shared/ownership';
import { objectIdSchema } from '@/shared/validation';

const attachCriteriaSchema = z.object({
  taskId: objectIdSchema,
  gradeCriteriaId: objectIdSchema,
  userId: objectIdSchema,
});

export const attachGradeCriteriaToTaskUseCase = async (data: {
  taskId: string;
  gradeCriteriaId: string;
  userId: string;
}): Promise<TaskEntity> => {
  const input = attachCriteriaSchema.parse(data);
  await assertTaskOwnedByUser(input.taskId, input.userId);
  const criteria = await GradeCriteriaRepository.getById(input.gradeCriteriaId);
  if (!criteria) {
    throw new Error('Critério não encontrado.');
  }
  if (!criteria.isPublic && criteria.userId !== input.userId) {
    throw new Error('Sem permissão para usar este critério.');
  }

  const updated = await TaskRepository.update(input.taskId, {
    classification: criteria.classification as GradeCriteriaClassification,
    gradeCriteriaId: criteria.id,
  });
  if (!updated) {
    throw new Error('Tarefa não encontrada.');
  }
  return updated;
};
