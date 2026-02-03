import { Queue } from 'bullmq';

import { redisConnection } from '@/infra/queues/redis';

export const llmAnalysisQueue = new Queue('llm-analysis', {
  connection: redisConnection,
});

export const enqueueLlmAnalysis = async (
  extractionId: string,
  delayMs = 0,
): Promise<void> => {
  await llmAnalysisQueue.add(
    'analyze-extraction',
    { extractionId },
    {
      jobId: extractionId,
      delay: delayMs,
      removeOnComplete: true,
      removeOnFail: false,
    },
  );
};
