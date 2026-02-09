import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';

import { PlanType, type UserEntity } from '@/domain/entities';
import { env } from '@/infra/config/env';

type UserDocument = {
  _id: ObjectId | string;
  name?: string;
  email?: string;
  plan_type?: PlanType;
  plan_quota?: number;
  plan_usage?: number;
};

const buildUserIdQuery = (userId: string) => {
  if (ObjectId.isValid(userId)) {
    return { $or: [{ _id: new ObjectId(userId) }, { _id: userId }] };
  }
  return { _id: userId };
};

const getUsersCollection = () =>
  mongoose.connection.getClient().db(env.MONGODB_DATABASE_NAME).collection<UserDocument>('users');

const ensurePlanDefaults = async (user: UserDocument): Promise<UserDocument> => {
  const planType = (user.plan_type as PlanType | undefined) ?? PlanType.FREE;
  const planQuota = typeof user.plan_quota === 'number' ? user.plan_quota : 10;
  const planUsage = typeof user.plan_usage === 'number' ? user.plan_usage : 0;

  if (
    user.plan_type !== planType ||
    user.plan_quota !== planQuota ||
    user.plan_usage !== planUsage
  ) {
    await getUsersCollection().updateOne(
      { _id: user._id },
      {
        $set: {
          plan_type: planType,
          plan_quota: planQuota,
          plan_usage: planUsage,
        },
      },
    );
  }

  return {
    ...user,
    plan_type: planType,
    plan_quota: planQuota,
    plan_usage: planUsage,
  };
};

export const UserRepository = {
  findByEmail: async (email: string): Promise<UserEntity | null> => {
    const foundUser = await getUsersCollection().findOne({ email });
    if (!foundUser) {
      return null;
    }

    const normalizedUser = await ensurePlanDefaults(foundUser);

    return {
      id: normalizedUser._id.toString(),
      name: normalizedUser.name ?? '',
      email: normalizedUser.email ?? '',
      password: '',
      planType: (normalizedUser.plan_type as PlanType | undefined) ?? PlanType.FREE,
      planQuota: normalizedUser.plan_quota ?? 10,
      planUsage: normalizedUser.plan_usage ?? 0,
    };
  },
  create: async (): Promise<UserEntity> => {
    throw new Error('Use Better Auth para criar usuários.');
  },
  findById: async (id: string): Promise<UserEntity | null> => {
    const foundUser = await getUsersCollection().findOne(buildUserIdQuery(id));
    if (!foundUser) {
      return null;
    }

    const normalizedUser = await ensurePlanDefaults(foundUser);

    return {
      id: normalizedUser._id.toString(),
      name: normalizedUser.name ?? '',
      email: normalizedUser.email ?? '',
      password: '',
      planType: (normalizedUser.plan_type as PlanType | undefined) ?? PlanType.FREE,
      planQuota: normalizedUser.plan_quota ?? 10,
      planUsage: normalizedUser.plan_usage ?? 0,
    };
  },
  incrementPlanUsage: async (data: { id: string; amount: number }): Promise<UserEntity> => {
    const foundUser = await getUsersCollection().findOne(buildUserIdQuery(data.id));
    if (!foundUser) {
      throw new Error('Usuário não encontrado.');
    }

    const normalizedUser = await ensurePlanDefaults(foundUser);

    const planQuota =
      typeof normalizedUser.plan_quota === 'number' ? normalizedUser.plan_quota : 10;
    const currentUsage =
      typeof normalizedUser.plan_usage === 'number' ? normalizedUser.plan_usage : 0;
    const nextUsage = currentUsage + data.amount;
    if (nextUsage > planQuota) {
      throw new Error('Limite de uso do plano atingido.');
    }

    const updateResult = await getUsersCollection().findOneAndUpdate(
      { _id: normalizedUser._id },
      { $set: { plan_usage: nextUsage } },
      { returnDocument: 'after', includeResultMetadata: true },
    );

    const saved = updateResult.value ?? { ...normalizedUser, plan_usage: nextUsage };

    return {
      id: saved._id.toString(),
      name: saved.name ?? '',
      email: saved.email ?? '',
      password: '',
      planType: (saved.plan_type as PlanType | undefined) ?? PlanType.FREE,
      planQuota: saved.plan_quota ?? 10,
      planUsage: saved.plan_usage ?? nextUsage,
    };
  },
};

export const userRepository = UserRepository;
