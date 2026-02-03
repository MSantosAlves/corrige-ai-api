export const GradeCriteriaClassifications = {
  MULTIPLE_CHOICES_EXAM: 'MULTIPLE_CHOICES_EXAM',
  HANDWRITTEN_ESSAY: 'HANDWRITTEN_ESSAY',
  MIXED_EXAM: 'MIXED_EXAM',
  PRINTED_ESSAY: 'PRINTED_ESSAY',
} as const;

export type GradeCriteriaClassification =
  (typeof GradeCriteriaClassifications)[keyof typeof GradeCriteriaClassifications];

export type GradeCriteriaItem = {
  label: string;
  weight: number;
  description?: string;
};

export type GradeCriteriaEntity = {
  id: string;
  userId: string;
  name: string;
  description?: string;
  classification: GradeCriteriaClassification;
  isPublic: boolean;
  maxScore: number;
  items: GradeCriteriaItem[];
  tags?: string[];
  createdAt: string;
  updatedAt: string;
};
