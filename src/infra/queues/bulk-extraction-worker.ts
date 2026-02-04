import { Worker } from 'bullmq';

import { pollBulkTaskExtractionsUseCase } from '@/application/usecases/extractions';
import { TaskExtractionBatchStatuses } from '@/domain/entities';
import { env } from '@/infra/config/env';
import { redisConnection } from '@/infra/queues/redis';
import { enqueueBulkExtractionPoll } from '@/infra/queues/bulk-extraction-queue';
import { logger } from '@/shared/logger';

const POLL_DELAY_MS = 3000;

export const startBulkExtractionWorker = (): void => {
  const worker = new Worker(
    'bulk-extraction',
    async (job) => {
      const batchId = typeof job.data?.batchId === 'string' ? job.data.batchId : '';
      if (!batchId) {
        throw new Error('batchId is required');
      }

      logger.info({ batchId, jobId: job.id }, 'Bulk extraction worker started');
      const result = await pollBulkTaskExtractionsUseCase(batchId);

      if (
        result.status === TaskExtractionBatchStatuses.PENDING ||
        result.status === TaskExtractionBatchStatuses.PROCESSING
      ) {
        await enqueueBulkExtractionPoll(batchId, POLL_DELAY_MS);
      }
      logger.info(
        { batchId, jobId: job.id, status: result.status },
        'Bulk extraction worker finished',
      );
    },
    { connection: redisConnection, concurrency: env.BULK_WORKER_CONCURRENCY },
  );

  worker.on('failed', (job, err) => {
    logger.error({ err, jobId: job?.id }, 'Bulk extraction worker failed');
  });

  worker.on('error', (err) => {
    logger.error({ err }, 'Bulk extraction worker error');
  });

  logger.info('Bulk extraction worker initialized');
};
