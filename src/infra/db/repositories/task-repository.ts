import mongoose, { Schema } from 'mongoose';
import { randomUUID } from 'crypto';

import { type TaskEntity } from '@/domain/entities';

type TaskDocument = mongoose.Document & {
  id: string;
  class_id: string;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
};

const taskSchema = new Schema<TaskDocument>(
  {
    id: { type: String, required: true, unique: true },
    class_id: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    created_at: { type: String, required: true },
    updated_at: { type: String, required: true },
  },
  { timestamps: false },
);

const TaskModel = mongoose.models.Task || mongoose.model<TaskDocument>('Task', taskSchema);

export const TaskRepository = {
  create: async (data: {
    classId: string;
    title: string;
    description?: string;
  }): Promise<TaskEntity> => {
    const now = new Date().toISOString();
    const task = {
      id: randomUUID(),
      class_id: data.classId,
      title: data.title,
      description: data.description || '',
      created_at: now,
      updated_at: now,
    };
    const created = await TaskModel.create(task);
    const saved = created.toObject() as TaskDocument;
    return {
      id: saved.id,
      classId: saved.class_id,
      title: saved.title,
      description: saved.description,
      createdAt: saved.created_at,
      updatedAt: saved.updated_at,
    };
  },

  listByClassId: async (classId: string): Promise<TaskEntity[]> => {
    const tasks = await TaskModel.find({ class_id: classId })
      .sort({ created_at: -1 })
      .lean<TaskDocument[]>()
      .exec();
    return tasks.map((taskItem) => ({
      id: taskItem.id,
      classId: taskItem.class_id,
      title: taskItem.title,
      description: taskItem.description,
      createdAt: taskItem.created_at,
      updatedAt: taskItem.updated_at,
    }));
  },

  getById: async (id: string): Promise<TaskEntity | null> => {
    const taskItem = await TaskModel.findOne({ id }).lean<TaskDocument | null>().exec();
    if (!taskItem) {
      return null;
    }
    return {
      id: taskItem.id,
      classId: taskItem.class_id,
      title: taskItem.title,
      description: taskItem.description,
      createdAt: taskItem.created_at,
      updatedAt: taskItem.updated_at,
    };
  },

  update: async (
    id: string,
    data: {
      title?: string;
      description?: string;
    },
  ): Promise<TaskEntity | null> => {
    const now = new Date().toISOString();
    const updated = await TaskModel.findOneAndUpdate(
      { id },
      { ...data, updated_at: now },
      { new: true },
    )
      .lean<TaskDocument | null>()
      .exec();
    if (!updated) {
      return null;
    }
    return {
      id: updated.id,
      classId: updated.class_id,
      title: updated.title,
      description: updated.description,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    };
  },

  delete: async (id: string): Promise<boolean> => {
    const result = await TaskModel.deleteOne({ id });
    return result.deletedCount > 0;
  },
};

export const taskRepository = TaskRepository;
