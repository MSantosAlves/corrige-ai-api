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

const DEFAULT_PLAN_QUOTA = 10;

const buildUserIdQuery = (userId: string) => {
  if (ObjectId.isValid(userId)) {
    return { $or: [{ _id: new ObjectId(userId) }, { _id: userId }] };
  }
  return { _id: userId };
};

const getUsersCollection = () =>
  mongoose.connection.getClient().db(env.MONGODB_DATABASE_NAME).collection<UserDocument>('users');

const mapToUserEntity = (user: UserDocument): UserEntity => ({
  id: user._id.toString(),
  name: user.name ?? '',
  email: user.email ?? '',
  password: '',
  planType: (user.plan_type as PlanType | undefined) ?? PlanType.FREE,
  planQuota: user.plan_quota ?? DEFAULT_PLAN_QUOTA,
  planUsage: user.plan_usage ?? 0,
});

const ensurePlanDefaults = async (user: UserDocument): Promise<UserDocument> => {
  const planType = (user.plan_type as PlanType | undefined) ?? PlanType.FREE;
  const planQuota =
    typeof user.plan_quota === 'number' ? user.plan_quota : DEFAULT_PLAN_QUOTA;
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
      ...mapToUserEntity(normalizedUser),
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
      ...mapToUserEntity(normalizedUser),
    };
  },
  reservePlanUsage: async (data: { id: string; amount: number }): Promise<UserEntity> => {
    const amount = Math.floor(data.amount);
    if (amount <= 0) {
      throw new Error('Quantidade inválida para consumo do plano.');
    }

    const query = buildUserIdQuery(data.id);
    const updateResult = await getUsersCollection().findOneAndUpdate(
      {
        ...query,
        $expr: {
          $lte: [
            { $add: [{ $ifNull: ['$plan_usage', 0] }, amount] },
            { $ifNull: ['$plan_quota', DEFAULT_PLAN_QUOTA] },
          ],
        },
      },
      { $inc: { plan_usage: amount } },
      { returnDocument: 'after', includeResultMetadata: true },
    );

    if (!updateResult.value) {
      const foundUser = await getUsersCollection().findOne(query);
      if (!foundUser) {
        throw new Error('Usuário não encontrado.');
      }
      throw new Error('Limite de uso do plano atingido.');
    }

    const normalizedUser = await ensurePlanDefaults(updateResult.value);
    return mapToUserEntity(normalizedUser);
  },
  rollbackPlanUsage: async (data: { id: string; amount: number }): Promise<UserEntity> => {
    const amount = Math.floor(data.amount);
    if (amount <= 0) {
      throw new Error('Quantidade inválida para rollback do plano.');
    }

    const updateResult = await getUsersCollection().findOneAndUpdate(
      buildUserIdQuery(data.id),
      [
        {
          $set: {
            plan_usage: {
              $max: [{ $subtract: [{ $ifNull: ['$plan_usage', 0] }, amount] }, 0],
            },
          },
        },
      ],
      { returnDocument: 'after', includeResultMetadata: true },
    );

    if (!updateResult.value) {
      throw new Error('Usuário não encontrado.');
    }

    const normalizedUser = await ensurePlanDefaults(updateResult.value);
    return mapToUserEntity(normalizedUser);
  },
  incrementPlanUsage: async (data: { id: string; amount: number }): Promise<UserEntity> => {
    return await UserRepository.reservePlanUsage(data);
  },
};

export const userRepository = UserRepository;
