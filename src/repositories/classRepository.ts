import mongoose, { Schema } from "mongoose";
import { randomUUID } from "crypto";

export type ClassEntity = {
  id: string;
  name: string;
  userId: string;
};

export type classEntity = ClassEntity;

type ClassDocument = mongoose.Document & {
  id: string;
  name: string;
  user_id: string;
};

const classSchema = new Schema<ClassDocument>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    user_id: { type: String, required: true }
  },
  { timestamps: true }
);

const classModel =
  mongoose.models.Class || mongoose.model<ClassDocument>("Class", classSchema);

export const ClassRepository = {
  create: async ({
    name,
    userId
  }: {
    name: string;
    userId: string;
  }): Promise<ClassEntity> => {
    const classItem = {
      id: randomUUID(),
      name,
      user_id: userId
    };
    const created = await classModel.create(classItem);
    const saved = created.toObject() as ClassDocument;
    return {
      id: saved.id,
      name: saved.name,
      userId: saved.user_id
    };
  },
  listByUserId: async (userId: string): Promise<ClassEntity[]> => {
    const classes = await classModel
      .find({ user_id: userId })
      .lean<ClassDocument[]>()
      .exec();
    return classes.map((classItem) => ({
      id: classItem.id,
      name: classItem.name,
      userId: classItem.user_id
    }));
  }
};

export const classRepository = ClassRepository;
