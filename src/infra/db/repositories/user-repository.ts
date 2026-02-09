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
  is_blocked?: boolean;
  block_info?: {
    extraction_id?: string;
    blocked_category?: string;
    blocked_reason?: string;
    blocked_at?: string;
  } | null;
};

const DEFAULT_PLAN_QUOTA = 10;
export const USER_BLOCKED_ERROR = 'Usuário bloqueado para novas extrações.';

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
  isBlocked: user.is_blocked === true,
  blockInfo: user.block_info
    ? {
        extractionId: user.block_info.extraction_id ?? '',
        blockedCategory: user.block_info.blocked_category ?? '',
        blockedReason: user.block_info.blocked_reason ?? '',
        blockedAt: user.block_info.blocked_at ?? '',
      }
    : null,
});

const ensurePlanDefaults = async (user: UserDocument): Promise<UserDocument> => {
  const planType = (user.plan_type as PlanType | undefined) ?? PlanType.FREE;
  const planQuota =
    typeof user.plan_quota === 'number' ? user.plan_quota : DEFAULT_PLAN_QUOTA;
  const planUsage = typeof user.plan_usage === 'number' ? user.plan_usage : 0;
  const isBlocked = user.is_blocked === true;
  const blockInfo = user.block_info ?? null;

  if (
    user.plan_type !== planType ||
    user.plan_quota !== planQuota ||
    user.plan_usage !== planUsage ||
    user.is_blocked !== isBlocked ||
    user.block_info !== blockInfo
  ) {
    await getUsersCollection().updateOne(
      { _id: user._id },
      {
        $set: {
          plan_type: planType,
          plan_quota: planQuota,
          plan_usage: planUsage,
          is_blocked: isBlocked,
          block_info: blockInfo,
        },
      },
    );
  }

  return {
    ...user,
    plan_type: planType,
    plan_quota: planQuota,
    plan_usage: planUsage,
    is_blocked: isBlocked,
    block_info: blockInfo,
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
        is_blocked: { $ne: true },
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
      if (foundUser.is_blocked === true) {
        throw new Error(USER_BLOCKED_ERROR);
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
  assertNotBlocked: async (id: string): Promise<void> => {
    const foundUser = await getUsersCollection().findOne(buildUserIdQuery(id), {
      projection: { _id: 1, is_blocked: 1 },
    });
    if (!foundUser) {
      throw new Error('Usuário não encontrado.');
    }
    if (foundUser.is_blocked === true) {
      throw new Error(USER_BLOCKED_ERROR);
    }
  },
  blockByOcr: async (data: {
    id: string;
    extractionId: string;
    blockedCategory: string;
    blockedReason: string;
  }): Promise<void> => {
    await getUsersCollection().updateOne(buildUserIdQuery(data.id), {
      $set: {
        is_blocked: true,
        block_info: {
          extraction_id: data.extractionId,
          blocked_category: data.blockedCategory,
          blocked_reason: data.blockedReason,
          blocked_at: new Date().toISOString(),
        },
      },
    });
  },
};

export const userRepository = UserRepository;
