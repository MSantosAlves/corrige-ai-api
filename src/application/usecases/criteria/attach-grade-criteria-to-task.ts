import { z } from 'zod';

import { GradeCriteriaRepository, TaskRepository } from '@/infra/db/repositories';
import { type GradeCriteriaClassification, type TaskEntity } from '@/domain/entities';

const attachCriteriaSchema = z.object({
  taskId: z.string().uuid(),
  gradeCriteriaId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const attachGradeCriteriaToTaskUseCase = async (data: {
  taskId: string;
  gradeCriteriaId: string;
  userId: string;
}): Promise<TaskEntity> => {
  const input = attachCriteriaSchema.parse(data);
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
