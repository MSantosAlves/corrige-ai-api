import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import { toNodeHandler } from 'better-auth/node';

import { env } from '@/infra/config/env';
import { auth } from '@/infra/auth/better-auth';
import { connectMongo } from '@/infra/db/mongo';
import { appRouter } from '@/infra/http/routes';
import { requestLogger } from '@/infra/http/middlewares';
import { logger } from '@/shared/logger';
import { startBulkExtractionWorker } from '@/infra/queues/bulk-extraction-worker';
import { startLlmAnalysisWorker } from '@/infra/queues/llm-analysis-worker';

const app = express();
const port = env.API_PORT;

const parsedCorsOrigins = env.CORS_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const corsAllowList = new Set<string>(parsedCorsOrigins);

if (env.ENV === 'development') {
  corsAllowList.add('http://localhost:3000');
  corsAllowList.add('http://127.0.0.1:3000');
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      if (corsAllowList.size === 0) {
        return callback(new Error('CORS not configured'), false);
      }
      if (corsAllowList.has(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
  }),
);
app.use('/api/auth', toNodeHandler(auth));
app.use(express.json());
app.use(requestLogger);

app.use(appRouter);

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  const reqLogger = (req as Request & { log?: typeof logger }).log ?? logger;
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Arquivo excede o tamanho máximo permitido.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Quantidade máxima de arquivos excedida.' });
    }
    if (err.code === 'LIMIT_PART_COUNT') {
      return res.status(400).json({ error: 'Quantidade máxima de partes do formulário excedida.' });
    }
    return res.status(400).json({ error: 'Upload inválido.' });
  }

  if (err.message.startsWith('Unsupported file type:')) {
    return res.status(400).json({ error: 'Tipo de arquivo não suportado.' });
  }

  reqLogger.error({ err }, 'Unhandled request error');
  res.status(500).json({ error: 'Erro inesperado.' });
});

app.listen(port, async () => {
  if (env.ENV === 'development') {
    logger.info({ port, baseUrl: env.API_BASE_URL }, 'API server running');
  }
  try {
    await connectMongo();
    startBulkExtractionWorker();
    startLlmAnalysisWorker();
  } catch {
    logger.error('[MongoDB] Failed to connect. Check MONGODB_URI.');
  }
});
