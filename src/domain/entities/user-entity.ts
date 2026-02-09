export enum PlanType {
  FREE = 'FREE',
  LITE = 'LITE',
  PRO = 'PRO',
  PREMIUM = 'PREMIUM',
}

export type UserBlockInfo = {
  extractionId: string;
  blockedCategory: string;
  blockedReason: string;
  blockedAt: string;
};

export type UserEntity = {
  id: string;
  name: string;
  email: string;
  password: string;
  planType: PlanType;
  planQuota: number;
  planUsage: number;
  isBlocked: boolean;
  blockInfo: UserBlockInfo | null;
};

export type PublicUserEntity = Omit<UserEntity, 'password'>;
