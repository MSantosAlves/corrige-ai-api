import type { GradeCriteriaClassification } from './grade-criteria-entity';

export type TaskEntity = {
  id: string;
  classId: string;
  title: string;
  description?: string;
  classification?: GradeCriteriaClassification;
  gradeCriteriaId?: string;
  createdAt: string;
  updatedAt: string;
};
