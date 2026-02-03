import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';

import { env } from '@/infra/config/env';
import { connectMongo } from '@/infra/db/mongo';
import { appRouter } from '@/infra/http/routes';
import { requestLogger } from '@/infra/http/middlewares';
import { logger } from '@/shared/logger';
import { startBulkExtractionWorker } from '@/infra/queues/bulk-extraction-worker';
import { startLlmAnalysisWorker } from '@/infra/queues/llm-analysis-worker';

const app = express();
const port = env.API_PORT;

app.use(
  cors({
    origin: [env.API_BASE_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'],
  }),
);
app.use(express.json());
app.use(requestLogger);

app.use(appRouter);

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  const reqLogger = (req as Request & { log?: typeof logger }).log ?? logger;
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
