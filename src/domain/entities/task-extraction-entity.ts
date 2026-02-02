export type TaskExtractionEntity = {
  id: string;
  taskId: string;
  ocrExtractionResult: Record<string, unknown>;
  analysisResult: string;
  filename: string;
  createdAt: string;
  updatedAt: string;
};
