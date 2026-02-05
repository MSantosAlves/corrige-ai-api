import mongoose, { Schema } from 'mongoose';

import { type ClassEntity } from '@/domain/entities';

type ClassDocument = mongoose.Document & {
  _id: mongoose.Types.ObjectId;
  name: string;
  user_id: string;
};

const classSchema = new Schema<ClassDocument>(
  {
    name: { type: String, required: true },
    user_id: { type: String, required: true },
  },
  { timestamps: true },
);

const classModel = mongoose.models.Class || mongoose.model<ClassDocument>('Class', classSchema);

export const ClassRepository = {
  create: async ({ name, userId }: { name: string; userId: string }): Promise<ClassEntity> => {
    const classItem = {
      name,
      user_id: userId,
    };
    const created = await classModel.create(classItem);
    const saved = created.toObject() as ClassDocument;
    return {
      id: saved._id.toString(),
      name: saved.name,
      userId: saved.user_id,
    };
  },
  listByUserId: async (userId: string): Promise<ClassEntity[]> => {
    const classes = await classModel.find({ user_id: userId }).lean<ClassDocument[]>().exec();
    return classes.map((classItem) => ({
      id: classItem._id.toString(),
      name: classItem.name,
      userId: classItem.user_id,
    }));
  },
};

export const classRepository = ClassRepository;
