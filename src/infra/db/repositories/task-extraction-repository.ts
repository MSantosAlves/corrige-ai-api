import mongoose, { Schema } from 'mongoose';
import { randomUUID } from 'crypto';

import { type TaskExtractionEntity } from '@/domain/entities';

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
  }): Promise<TaskExtractionEntity> => {
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
    const saved = created.toObject() as TaskExtractionEntity;
    return {
      id: saved.id,
      taskId: saved.taskId,
      ocrExtractionResult: saved.ocrExtractionResult,
      analysisResult: saved.analysisResult,
      filename: saved.filename,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  },

  listByTaskId: async (taskId: string): Promise<TaskExtractionEntity[]> => {
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

  getById: async (id: string): Promise<TaskExtractionEntity | null> => {
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
