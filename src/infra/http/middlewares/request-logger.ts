import pinoHttp from 'pino-http';

import { logger } from '@/shared/logger';

export const requestLogger = pinoHttp({
  logger,
  redact: {
    paths: ['req.headers', 'res.headers'],
    remove: true,
  },
});
