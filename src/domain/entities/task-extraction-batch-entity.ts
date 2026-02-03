export const TaskExtractionBatchStatuses = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  DONE: 'DONE',
  ERROR: 'ERROR',
} as const;

export type TaskExtractionBatchStatus =
  (typeof TaskExtractionBatchStatuses)[keyof typeof TaskExtractionBatchStatuses];

export type TaskExtractionBatchEntity = {
  id: string;
  taskId: string;
  ocrJobId: string;
  status: TaskExtractionBatchStatus;
  createdAt: string;
  updatedAt: string;
};
