export type TaskExtractionStatus = 'pending' | 'ocr_finished' | 'analysing' | 'done' | 'error';

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
