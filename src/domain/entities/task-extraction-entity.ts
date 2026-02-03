export const TaskExtractionStatuses = {
  PENDING: 'PENDING',
  TEXT_EXTRACTION: 'TEXT_EXTRACTION',
  TEXT_ANALYSIS: 'TEXT_ANALYSIS',
  DONE: 'DONE',
  ERROR: 'ERROR',
} as const;

export type TaskExtractionStatus =
  (typeof TaskExtractionStatuses)[keyof typeof TaskExtractionStatuses];

export type TaskExtractionEntity = {
  id: string;
  taskId: string;
  batchId?: string | null;
  status: TaskExtractionStatus;
  ocrResultId?: string | null;
  ocrExtractionResult?: Record<string, unknown> | null;
  analysisResult?: string | null;
  filename: string;
  createdAt: string;
  updatedAt: string;
};
