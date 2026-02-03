import pinoHttp from 'pino-http';

import { logger } from '@/shared/logger';

export const requestLogger = pinoHttp({
  logger,
  redact: {
    paths: [
      'req.headers',
      'res.headers',
      'req.query',
      'req.params',
      'req.remoteAddress',
      'req.remotePort',
    ],
    remove: true,
  },
});
