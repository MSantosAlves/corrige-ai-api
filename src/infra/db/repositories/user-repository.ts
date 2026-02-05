import mongoose, { Schema } from 'mongoose';

import { type UserEntity } from '@/domain/entities';

type UserDocument = mongoose.Document &
  Omit<UserEntity, 'id'> & {
    _id: mongoose.Types.ObjectId;
  };

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
  },
  { timestamps: true },
);

const userModel = mongoose.models.User || mongoose.model<UserDocument>('User', userSchema);

export const UserRepository = {
  findByEmail: async (email: string): Promise<UserEntity | null> => {
    const foundUser = await userModel.findOne({ email }).lean<UserDocument | null>().exec();
    if (!foundUser) {
      return null;
    }
    return {
      id: foundUser._id.toString(),
      name: foundUser.name,
      email: foundUser.email,
      password: foundUser.password,
    };
  },
  create: async (data: { name: string; email: string; password: string }): Promise<UserEntity> => {
    const newUser = {
      name: data.name,
      email: data.email,
      password: data.password,
    };
    const created = await userModel.create(newUser);
    const saved = created.toObject() as UserDocument;
    return {
      id: saved._id.toString(),
      name: saved.name,
      email: saved.email,
      password: saved.password,
    };
  },
};

export const userRepository = UserRepository;
