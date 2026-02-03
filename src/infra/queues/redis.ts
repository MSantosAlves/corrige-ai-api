import IORedis from 'ioredis';

import { env } from '@/infra/config/env';

export const redisConnection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});
