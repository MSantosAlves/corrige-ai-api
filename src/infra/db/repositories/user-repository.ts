import mongoose, { Schema } from 'mongoose';
import { randomUUID } from 'crypto';

import { type UserEntity } from '@/domain/entities';

type UserDocument = mongoose.Document & UserEntity;

const userSchema = new Schema<UserDocument>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
  },
  { timestamps: true },
);

const userModel = mongoose.models.User || mongoose.model<UserDocument>('User', userSchema);

export const UserRepository = {
  findByEmail: async (email: string): Promise<UserEntity | null> => {
    const foundUser = await userModel.findOne({ email }).lean<UserEntity>().exec();
    return foundUser ?? null;
  },
  create: async (data: { name: string; email: string; password: string }): Promise<UserEntity> => {
    const newUser: UserEntity = {
      id: randomUUID(),
      name: data.name,
      email: data.email,
      password: data.password,
    };
    const created = await userModel.create(newUser);
    return created.toObject() as UserEntity;
  },
};

export const userRepository = UserRepository;
