import mongoose, { Schema } from 'mongoose';
import { randomUUID } from 'crypto';

import { type TaskExtractionEntity, type TaskExtractionStatus } from '@/domain/entities';

type TaskExtractionDocument = mongoose.Document & {
  id: string;
  task_id: string;
  batch_id?: string | null;
  status: TaskExtractionStatus;
  ocr_result_id?: string | null;
  ocr_extraction_result?: Record<string, unknown> | null;
  analysis_result?: string | null;
  filename: string;
  created_at: string;
  updated_at: string;
};

const TaskExtractionSchema = new Schema<TaskExtractionDocument>(
  {
    id: { type: String, required: true, unique: true },
    task_id: { type: String, required: true, index: true },
    batch_id: { type: String, required: false, index: true },
    status: { type: String, required: true, index: true },
    ocr_result_id: { type: String, required: false },
    ocr_extraction_result: { type: Schema.Types.Mixed, required: false, default: null },
    analysis_result: { type: String, required: false, default: null },
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
    filename: string;
    batchId?: string | null;
    status?: TaskExtractionStatus;
    ocrResultId?: string | null;
    ocrExtractionResult?: Record<string, unknown> | null;
    analysisResult?: string | null;
  }): Promise<TaskExtractionEntity> => {
    const now = new Date().toISOString();
    const extraction = {
      id: randomUUID(),
      task_id: data.taskId,
      batch_id: data.batchId ?? null,
      status: data.status ?? 'pending',
      ocr_result_id: data.ocrResultId ?? null,
      ocr_extraction_result: data.ocrExtractionResult ?? null,
      analysis_result: data.analysisResult ?? null,
      filename: data.filename,
      created_at: now,
      updated_at: now,
    };
    const created = await TaskExtractionModel.create(extraction);
    const saved = created.toObject() as TaskExtractionDocument;
    return {
      id: saved.id,
      taskId: saved.task_id,
      batchId: saved.batch_id ?? null,
      status: saved.status,
      ocrResultId: saved.ocr_result_id ?? null,
      ocrExtractionResult: saved.ocr_extraction_result,
      analysisResult: saved.analysis_result,
      filename: saved.filename,
      createdAt: saved.created_at,
      updatedAt: saved.updated_at,
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
      batchId: extraction.batch_id ?? null,
      status: extraction.status,
      ocrResultId: extraction.ocr_result_id ?? null,
      ocrExtractionResult: extraction.ocr_extraction_result,
      analysisResult: extraction.analysis_result,
      filename: extraction.filename,
      createdAt: extraction.created_at,
      updatedAt: extraction.updated_at,
    }));
  },

  listByBatchId: async (batchId: string): Promise<TaskExtractionEntity[]> => {
    const extractions = await TaskExtractionModel.find({ batch_id: batchId })
      .sort({ created_at: -1 })
      .lean<TaskExtractionDocument[]>()
      .exec();
    return extractions.map((extraction) => ({
      id: extraction.id,
      taskId: extraction.task_id,
      batchId: extraction.batch_id ?? null,
      status: extraction.status,
      ocrResultId: extraction.ocr_result_id ?? null,
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
      batchId: extraction.batch_id ?? null,
      status: extraction.status,
      ocrResultId: extraction.ocr_result_id ?? null,
      ocrExtractionResult: extraction.ocr_extraction_result,
      analysisResult: extraction.analysis_result,
      filename: extraction.filename,
      createdAt: extraction.created_at,
      updatedAt: extraction.updated_at,
    };
  },

  updateByOcrResultId: async (
    ocrResultId: string,
    data: {
      status?: TaskExtractionStatus;
      ocrExtractionResult?: Record<string, unknown> | null;
      analysisResult?: string | null;
    },
  ): Promise<TaskExtractionEntity | null> => {
    const current = await TaskExtractionModel.findOne({ ocr_result_id: ocrResultId })
      .lean<TaskExtractionDocument | null>()
      .exec();
    if (!current) {
      return null;
    }

    const shouldPreserveStatus =
      current.status === 'analysing' || current.status === 'done' || current.status === 'error';
    const nextStatus =
      typeof data.status === 'string' && !shouldPreserveStatus ? data.status : current.status;
    const nextOcrResult =
      data.ocrExtractionResult !== undefined
        ? data.ocrExtractionResult
        : current.ocr_extraction_result;
    const nextAnalysisResult =
      data.analysisResult !== undefined ? data.analysisResult : current.analysis_result;

    const now = new Date().toISOString();
    const updated = await TaskExtractionModel.findOneAndUpdate(
      { id: current.id },
      {
        status: nextStatus,
        ocr_extraction_result: nextOcrResult,
        analysis_result: nextAnalysisResult,
        updated_at: now,
      },
      { new: true },
    )
      .lean<TaskExtractionDocument | null>()
      .exec();
    if (!updated) {
      return null;
    }
    return {
      id: updated.id,
      taskId: updated.task_id,
      batchId: updated.batch_id ?? null,
      status: updated.status,
      ocrResultId: updated.ocr_result_id ?? null,
      ocrExtractionResult: updated.ocr_extraction_result,
      analysisResult: updated.analysis_result,
      filename: updated.filename,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    };
  },

  updateById: async (
    id: string,
    data: {
      status?: TaskExtractionStatus;
      analysisResult?: string | null;
    },
  ): Promise<TaskExtractionEntity | null> => {
    const now = new Date().toISOString();
    const updated = await TaskExtractionModel.findOneAndUpdate(
      { id },
      {
        ...(typeof data.status === 'string' ? { status: data.status } : {}),
        ...(data.analysisResult !== undefined ? { analysis_result: data.analysisResult } : {}),
        updated_at: now,
      },
      { new: true },
    )
      .lean<TaskExtractionDocument | null>()
      .exec();
    if (!updated) {
      return null;
    }
    return {
      id: updated.id,
      taskId: updated.task_id,
      batchId: updated.batch_id ?? null,
      status: updated.status,
      ocrResultId: updated.ocr_result_id ?? null,
      ocrExtractionResult: updated.ocr_extraction_result,
      analysisResult: updated.analysis_result,
      filename: updated.filename,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    };
  },
};
