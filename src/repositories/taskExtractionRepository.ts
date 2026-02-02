import mongoose, { Schema } from 'mongoose';
import { randomUUID } from 'crypto';

export type TaskExtraction = {
  id: string;
  taskId: string;
  ocrExtractionResult: Record<string, unknown>;
  analysisResult: string;
  filename: string;
  createdAt: string;
  updatedAt: string;
};

type TaskExtractionDocument = mongoose.Document & {
  id: string;
  task_id: string;
  ocr_extraction_result: Record<string, unknown>;
  analysis_result: string;
  filename: string;
  created_at: string;
  updated_at: string;
};

const TaskExtractionSchema = new Schema<TaskExtractionDocument>(
  {
    id: { type: String, required: true, unique: true },
    task_id: { type: String, required: true, index: true },
    ocr_extraction_result: { type: Schema.Types.Mixed, required: true },
    analysis_result: { type: String, required: true },
    filename: { type: String, required: true },
    created_at: { type: String, required: true },
    updated_at: { type: String, required: true },
  },
  { timestamps: false },
);

const TaskExtractionModel =
  mongoose.models['task-extractions'] ||
  mongoose.model<TaskExtractionDocument>('task-extractions', TaskExtractionSchema);

export const TaskExtractionRepository = {
  create: async (data: {
    taskId: string;
    ocrExtractionResult: Record<string, unknown>;
    analysisResult: string;
    filename: string;
  }): Promise<TaskExtraction> => {
    const now = new Date().toISOString();
    const extraction = {
      id: randomUUID(),
      task_id: data.taskId,
      ocr_extraction_result: data.ocrExtractionResult,
      analysis_result: data.analysisResult,
      filename: data.filename,
      created_at: now,
      updated_at: now,
    };
    const created = await TaskExtractionModel.create(extraction);
    const saved = created.toObject() as TaskExtractionDocument;
    return {
      id: saved.id,
      taskId: saved.task_id,
      ocrExtractionResult: saved.ocr_extraction_result,
      analysisResult: saved.analysis_result,
      filename: saved.filename,
      createdAt: saved.created_at,
      updatedAt: saved.updated_at,
    };
  },

  listByTaskId: async (taskId: string): Promise<TaskExtraction[]> => {
    const extractions = await TaskExtractionModel.find({ task_id: taskId })
      .sort({ created_at: -1 })
      .lean<TaskExtractionDocument[]>()
      .exec();
    return extractions.map((extraction) => ({
      id: extraction.id,
      taskId: extraction.task_id,
      ocrExtractionResult: extraction.ocr_extraction_result,
      analysisResult: extraction.analysis_result,
      filename: extraction.filename,
      createdAt: extraction.created_at,
      updatedAt: extraction.updated_at,
    }));
  },

  getById: async (id: string): Promise<TaskExtraction | null> => {
    const extraction = await TaskExtractionModel.findOne({ id })
      .lean<TaskExtractionDocument | null>()
      .exec();
    if (!extraction) {
      return null;
    }
    return {
      id: extraction.id,
      taskId: extraction.task_id,
      ocrExtractionResult: extraction.ocr_extraction_result,
      analysisResult: extraction.analysis_result,
      filename: extraction.filename,
      createdAt: extraction.created_at,
      updatedAt: extraction.updated_at,
    };
  },
};
