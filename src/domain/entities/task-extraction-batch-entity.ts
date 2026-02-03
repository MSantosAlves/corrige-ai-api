export type TaskExtractionBatchStatus = 'pending' | 'processing' | 'done' | 'error';

export type TaskExtractionBatchEntity = {
  id: string;
  taskId: string;
  ocrJobId: string;
  status: TaskExtractionBatchStatus;
  createdAt: string;
  updatedAt: string;
};
