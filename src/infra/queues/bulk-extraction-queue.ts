import { Queue } from 'bullmq';

import { redisConnection } from '@/infra/queues/redis';
import { logger } from '@/shared/logger';

export const bulkExtractionQueue = new Queue('bulk-extraction', {
  connection: redisConnection,
});

export const enqueueBulkExtractionPoll = async (batchId: string, delayMs = 3000): Promise<void> => {
  const uniqueJobId = `${batchId}-${Date.now()}`;
  await bulkExtractionQueue.add(
    'poll-batch',
    { batchId },
    {
      jobId: uniqueJobId,
      delay: delayMs,
      removeOnComplete: true,
      removeOnFail: false,
    },
  );
  logger.info({ batchId, jobId: uniqueJobId, delayMs }, 'Bulk extraction poll enqueued');
};
