import express from 'express';
import cors from 'cors';

import { env } from '@/infra/config/env';
import { connectMongo } from '@/infra/db/mongo';
import { appRouter } from '@/infra/http/routes';

const app = express();
const port = env.API_PORT;

app.use(
  cors({
    origin: [env.API_BASE_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'],
  }),
);
app.use(express.json());

app.use((req, res, next) => {
  const startedAt = Date.now();
  console.log(`[REQ] ${req.method} ${req.originalUrl}`);
  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const status = res.statusCode;
    if (status >= 400) {
      console.error(`[ERR] ${req.method} ${req.originalUrl} ${status} ${durationMs}ms`);
    } else {
      console.log(`[RES] ${req.method} ${req.originalUrl} ${status} ${durationMs}ms`);
    }
  });
  next();
});

app.use(appRouter);

app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(`[ERR] ${req.method} ${req.originalUrl}`, err);
  res.status(500).json({ error: 'Erro inesperado.' });
});

app.listen(port, async () => {
  if (env.ENV === 'development') {
    console.log(`API_BASE_URL: ${env.API_BASE_URL}:${port}`);
  }
  try {
    await connectMongo();
  } catch {
    console.error('[MongoDB] Failed to connect. Check MONGODB_URI.');
  }
});
