import mongoose, { Schema } from 'mongoose';
import { randomUUID } from 'crypto';

import { type TaskExtractionBatchEntity, type TaskExtractionBatchStatus } from '@/domain/entities';

type TaskExtractionBatchDocument = mongoose.Document & {
  id: string;
  task_id: string;
  ocr_job_id: string;
  status: TaskExtractionBatchStatus;
  created_at: string;
  updated_at: string;
};

const TaskExtractionBatchSchema = new Schema<TaskExtractionBatchDocument>(
  {
    id: { type: String, required: true, unique: true },
    task_id: { type: String, required: true, index: true },
    ocr_job_id: { type: String, required: true, index: true },
    status: { type: String, required: true, index: true },
    created_at: { type: String, required: true },
    updated_at: { type: String, required: true },
  },
  { timestamps: false },
);

const TaskExtractionBatchModel =
  mongoose.models['task-extraction-batches'] ||
  mongoose.model<TaskExtractionBatchDocument>('task-extraction-batches', TaskExtractionBatchSchema);

export const TaskExtractionBatchRepository = {
  create: async (data: {
    taskId: string;
    ocrJobId: string;
    status?: TaskExtractionBatchStatus;
  }): Promise<TaskExtractionBatchEntity> => {
    const now = new Date().toISOString();
    const batch = {
      id: randomUUID(),
      task_id: data.taskId,
      ocr_job_id: data.ocrJobId,
      status: data.status ?? 'pending',
      created_at: now,
      updated_at: now,
    };
    const created = await TaskExtractionBatchModel.create(batch);
    const saved = created.toObject() as TaskExtractionBatchDocument;
    return {
      id: saved.id,
      taskId: saved.task_id,
      ocrJobId: saved.ocr_job_id,
      status: saved.status,
      createdAt: saved.created_at,
      updatedAt: saved.updated_at,
    };
  },

  getById: async (id: string): Promise<TaskExtractionBatchEntity | null> => {
    const batch = await TaskExtractionBatchModel.findOne({ id })
      .lean<TaskExtractionBatchDocument | null>()
      .exec();
    if (!batch) {
      return null;
    }
    return {
      id: batch.id,
      taskId: batch.task_id,
      ocrJobId: batch.ocr_job_id,
      status: batch.status,
      createdAt: batch.created_at,
      updatedAt: batch.updated_at,
    };
  },

  updateStatus: async (
    id: string,
    status: TaskExtractionBatchStatus,
  ): Promise<TaskExtractionBatchEntity | null> => {
    const now = new Date().toISOString();
    const updated = await TaskExtractionBatchModel.findOneAndUpdate(
      { id },
      { status, updated_at: now },
      { new: true },
    )
      .lean<TaskExtractionBatchDocument | null>()
      .exec();
    if (!updated) {
      return null;
    }
    return {
      id: updated.id,
      taskId: updated.task_id,
      ocrJobId: updated.ocr_job_id,
      status: updated.status,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    };
  },

  listByStatuses: async (
    statuses: TaskExtractionBatchStatus[],
    limit = 50,
  ): Promise<TaskExtractionBatchEntity[]> => {
    const batches = await TaskExtractionBatchModel.find({ status: { $in: statuses } })
      .sort({ created_at: 1 })
      .limit(limit)
      .lean<TaskExtractionBatchDocument[]>()
      .exec();
    return batches.map((batch) => ({
      id: batch.id,
      taskId: batch.task_id,
      ocrJobId: batch.ocr_job_id,
      status: batch.status,
      createdAt: batch.created_at,
      updatedAt: batch.updated_at,
    }));
  },
};

export const taskExtractionBatchRepository = TaskExtractionBatchRepository;
