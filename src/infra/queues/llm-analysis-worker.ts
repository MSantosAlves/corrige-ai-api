import { Worker } from 'bullmq';

import { LlmClient } from '@/infra/providers/llm/llm-client';
import { redisConnection } from '@/infra/queues/redis';
import { TaskExtractionRepository } from '@/infra/db/repositories';
import { logger } from '@/shared/logger';

const llmClientInstance = new LlmClient();

export const startLlmAnalysisWorker = (): void => {
  const worker = new Worker(
    'llm-analysis',
    async (job) => {
      const extractionId =
        typeof job.data?.extractionId === 'string' ? job.data.extractionId : '';
      if (!extractionId) {
        throw new Error('extractionId is required');
      }

      logger.info({ extractionId, jobId: job.id }, 'LLM analysis worker started');
      const extraction = await TaskExtractionRepository.getById(extractionId);
      if (!extraction || !extraction.ocrExtractionResult || extraction.analysisResult) {
        logger.info(
          { extractionId, jobId: job.id },
          'LLM analysis worker skipped (no OCR result or already analyzed)',
        );
        return;
      }

      await TaskExtractionRepository.updateById(extraction.id, {
        status: 'analysing',
      });

      const ocrResult = extraction.ocrExtractionResult as { text?: string; document_type?: string };
      const extractedText = typeof ocrResult.text === 'string' ? ocrResult.text : '';
      if (!extractedText.trim()) {
        await TaskExtractionRepository.updateById(extraction.id, {
          status: 'error',
          analysisResult: 'Empty OCR text.',
        });
        logger.info(
          { extractionId, jobId: job.id },
          'LLM analysis worker finished with empty OCR text',
        );
        return;
      }

      const analysis = await llmClientInstance.analyzeText(
        extractedText,
        ocrResult.document_type ?? 'auto',
      );

      await TaskExtractionRepository.updateById(extraction.id, {
        status: 'done',
        analysisResult: typeof analysis === 'string' ? analysis : JSON.stringify(analysis),
      });
      logger.info({ extractionId, jobId: job.id }, 'LLM analysis worker finished');
    },
    { connection: redisConnection },
  );

  worker.on('failed', (job, err) => {
    logger.error({ err, jobId: job?.id }, 'LLM analysis worker failed');
  });

  worker.on('error', (err) => {
    logger.error({ err }, 'LLM analysis worker error');
  });

  logger.info('LLM analysis worker initialized');
};
