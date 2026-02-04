import type { Request } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

import { env } from '@/infra/config/env';

const isSseStreamRequest = (req: Request): boolean =>
  req.path.startsWith('/extractions/bulk/') && req.path.endsWith('/events');

export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_GLOBAL_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
  skip: isSseStreamRequest,
});

export const publicRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_PUBLIC_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

export const publicHourlyRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS * 60,
  max: env.RATE_LIMIT_PUBLIC_HOURLY_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

export const llmRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_LLM_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? ''),
  message: { error: 'Too many requests. Please try again later.' },
});
