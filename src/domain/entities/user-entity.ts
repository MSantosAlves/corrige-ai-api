export enum PlanType {
  FREE = 'FREE',
  LITE = 'LITE',
  PRO = 'PRO',
  PREMIUM = 'PREMIUM',
}

export type UserEntity = {
  id: string;
  name: string;
  email: string;
  password: string;
  planType: PlanType;
  planQuota: number;
  planUsage: number;
};

export type PublicUserEntity = Omit<UserEntity, 'password'>;
