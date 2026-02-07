import mongoose, { Schema } from 'mongoose';

import { PlanType, type UserEntity } from '@/domain/entities';

type UserDocument = mongoose.Document & {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  plan_type?: PlanType;
  plan_quota?: number;
  plan_usage?: number;
};

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    plan_type: {
      type: String,
      enum: Object.values(PlanType),
      default: PlanType.FREE,
      required: true,
    },
    plan_quota: { type: Number, default: 50, required: true },
    plan_usage: { type: Number, default: 0, required: true },
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
      planType: (foundUser.plan_type as PlanType | undefined) ?? PlanType.FREE,
      planQuota: foundUser.plan_quota ?? 50,
      planUsage: foundUser.plan_usage ?? 0,
    };
  },
  create: async (data: { name: string; email: string; password: string }): Promise<UserEntity> => {
    const newUser = {
      name: data.name,
      email: data.email,
      password: data.password,
      plan_type: PlanType.FREE,
      plan_quota: 50,
      plan_usage: 0,
    };
    const created = await userModel.create(newUser);
    const saved = created.toObject() as UserDocument;
    return {
      id: saved._id.toString(),
      name: saved.name,
      email: saved.email,
      password: saved.password,
      planType: (saved.plan_type as PlanType | undefined) ?? PlanType.FREE,
      planQuota: saved.plan_quota ?? 50,
      planUsage: saved.plan_usage ?? 0,
    };
  },
  findById: async (id: string): Promise<UserEntity | null> => {
    const foundUser = await userModel.findById(id).lean<UserDocument | null>().exec();
    if (!foundUser) {
      return null;
    }
    return {
      id: foundUser._id.toString(),
      name: foundUser.name,
      email: foundUser.email,
      password: foundUser.password,
      planType: (foundUser.plan_type as PlanType | undefined) ?? PlanType.FREE,
      planQuota: foundUser.plan_quota ?? 50,
      planUsage: foundUser.plan_usage ?? 0,
    };
  },
  incrementPlanUsage: async (data: { id: string; amount: number }): Promise<UserEntity> => {
    const foundUser = await userModel.findById(data.id).exec();
    if (!foundUser) {
      throw new Error('Usuário não encontrado.');
    }

    const planQuota = typeof foundUser.plan_quota === 'number' ? foundUser.plan_quota : 50;
    const currentUsage = typeof foundUser.plan_usage === 'number' ? foundUser.plan_usage : 0;
    const nextUsage = currentUsage + data.amount;
    if (nextUsage > planQuota) {
      throw new Error('Limite de uso do plano atingido.');
    }

    foundUser.plan_usage = nextUsage;
    const saved = await foundUser.save();

    return {
      id: saved._id.toString(),
      name: saved.name,
      email: saved.email,
      password: saved.password,
      planType: (saved.plan_type as PlanType | undefined) ?? PlanType.FREE,
      planQuota: saved.plan_quota ?? 50,
      planUsage: saved.plan_usage ?? 0,
    };
  },
};

export const userRepository = UserRepository;
