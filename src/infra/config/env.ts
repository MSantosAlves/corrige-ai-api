import * as dotenvSafe from 'dotenv-safe';
import { z } from 'zod';

export const isProduction =
  process.env.NODE_ENV === 'production' || process.env.ENV === 'production';

if (!isProduction) {
  dotenvSafe.config({ example: '.env.example', allowEmptyValues: true });
}

const envSchema = z.object({
  API_BASE_URL: z.string().min(1),
  API_PORT: z.coerce.number(),
  ENV: z.string().optional().default('development'),
  LOG_LEVEL: z.string().optional().default('info'),
  REDIS_URL: z.string().optional().default('redis://127.0.0.1:6379'),
  MONGODB_URI: z.string().min(1),
  MONGODB_DATABASE_NAME: z.string().min(1),
  CORS_ORIGINS: z.string().optional().default(''),
  JWT_SECRET: z.string().optional().default('dev-secret'),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
  FRONTEND_BASE_URL: z.string().optional().default(''),
  BETTER_AUTH_USE_TRANSACTIONS: z.string().optional().default('false'),
  OCR_BASE_URL: z.string().optional().default('http://127.0.0.1:8000'),
  OCR_API_KEY: z.string().min(1),
  SIGN_UP_KEY: z.string().optional().default(''),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().optional().default(60_000),
  RATE_LIMIT_PUBLIC_MAX: z.coerce.number().optional().default(10),
  RATE_LIMIT_PUBLIC_HOURLY_MAX: z.coerce.number().optional().default(200),
  RATE_LIMIT_GLOBAL_MAX: z.coerce.number().optional().default(60),
  RATE_LIMIT_LLM_MAX: z.coerce.number().optional().default(5),
  BULK_WORKER_CONCURRENCY: z.coerce.number().optional().default(1),
  LLM_WORKER_CONCURRENCY: z.coerce.number().optional().default(1),
  SSE_POLL_INTERVAL_MS: z.coerce.number().optional().default(3000),
  SSE_KEEPALIVE_INTERVAL_MS: z.coerce.number().optional().default(15000),
  UPLOAD_MAX_FILE_SIZE_BYTES: z.coerce.number().optional().default(10 * 1024 * 1024),
  UPLOAD_MAX_FILES_PER_BULK: z.coerce.number().optional().default(10),
  UPLOAD_MAX_PARTS: z.coerce.number().optional().default(30),
  UPLOAD_ALLOWED_MIME_TYPES: z
    .string()
    .optional()
    .default('application/pdf,image/png,image/jpeg'),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().optional(),
  ANTHROPIC_FALLBACK_MODEL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
});

export const env = envSchema.parse({
  API_BASE_URL: process.env.API_BASE_URL,
  API_PORT: process.env.API_PORT,
  ENV: process.env.ENV,
  LOG_LEVEL: process.env.LOG_LEVEL,
  REDIS_URL: process.env.REDIS_URL,
  MONGODB_URI: process.env.MONGODB_URI,
  MONGODB_DATABASE_NAME: process.env.MONGODB_DATABASE_NAME,
  CORS_ORIGINS: process.env.CORS_ORIGINS,
  JWT_SECRET: process.env.JWT_SECRET,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
  FRONTEND_BASE_URL: process.env.FRONTEND_BASE_URL,
  BETTER_AUTH_USE_TRANSACTIONS: process.env.BETTER_AUTH_USE_TRANSACTIONS,
  OCR_BASE_URL: process.env.OCR_BASE_URL,
  OCR_API_KEY: process.env.OCR_API_KEY,
  SIGN_UP_KEY: process.env.SIGN_UP_KEY,
  RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_PUBLIC_MAX: process.env.RATE_LIMIT_PUBLIC_MAX,
  RATE_LIMIT_PUBLIC_HOURLY_MAX: process.env.RATE_LIMIT_PUBLIC_HOURLY_MAX,
  RATE_LIMIT_GLOBAL_MAX: process.env.RATE_LIMIT_GLOBAL_MAX,
  RATE_LIMIT_LLM_MAX: process.env.RATE_LIMIT_LLM_MAX,
  BULK_WORKER_CONCURRENCY: process.env.BULK_WORKER_CONCURRENCY,
  LLM_WORKER_CONCURRENCY: process.env.LLM_WORKER_CONCURRENCY,
  SSE_POLL_INTERVAL_MS: process.env.SSE_POLL_INTERVAL_MS,
  SSE_KEEPALIVE_INTERVAL_MS: process.env.SSE_KEEPALIVE_INTERVAL_MS,
  UPLOAD_MAX_FILE_SIZE_BYTES: process.env.UPLOAD_MAX_FILE_SIZE_BYTES,
  UPLOAD_MAX_FILES_PER_BULK: process.env.UPLOAD_MAX_FILES_PER_BULK,
  UPLOAD_MAX_PARTS: process.env.UPLOAD_MAX_PARTS,
  UPLOAD_ALLOWED_MIME_TYPES: process.env.UPLOAD_ALLOWED_MIME_TYPES,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
  ANTHROPIC_FALLBACK_MODEL: process.env.ANTHROPIC_FALLBACK_MODEL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
});
