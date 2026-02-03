import * as dotenvSafe from 'dotenv-safe';
import { z } from 'zod';

dotenvSafe.config({ example: '.env.example', allowEmptyValues: true });

const envSchema = z.object({
  API_BASE_URL: z.string().min(1),
  API_PORT: z.coerce.number(),
  ENV: z.string().optional().default('development'),
  LOG_LEVEL: z.string().optional().default('info'),
  REDIS_URL: z.string().optional().default('redis://127.0.0.1:6379'),
  MONGODB_URI: z.string().min(1),
  MONGODB_DATABASE_NAME: z.string().min(1),
  JWT_SECRET: z.string().optional().default('dev-secret'),
  OCR_BASE_URL: z.string().optional().default('http://127.0.0.1:8000'),
  OCR_API_KEY: z.string().optional(),
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
  JWT_SECRET: process.env.JWT_SECRET,
  OCR_BASE_URL: process.env.OCR_BASE_URL,
  OCR_API_KEY: process.env.OCR_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
  ANTHROPIC_FALLBACK_MODEL: process.env.ANTHROPIC_FALLBACK_MODEL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
});
