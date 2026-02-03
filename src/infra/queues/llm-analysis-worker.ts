import { Worker } from 'bullmq';

import { LlmClient } from '@/infra/providers/llm/llm-client';
import { redisConnection } from '@/infra/queues/redis';
import { TaskExtractionStatuses } from '@/domain/entities';
import { TaskExtractionRepository, TaskRepository, GradeCriteriaRepository } from '@/infra/db/repositories';
import { logger } from '@/shared/logger';
import { buildGradeCriteriaPrompt } from '@/infra/providers/llm/prompts/grade-criteria';

const llmClientInstance = new LlmClient();

export const startLlmAnalysisWorker = (): void => {
  const worker = new Worker(
    'llm-analysis',
    async (job) => {
      const extractionId = typeof job.data?.extractionId === 'string' ? job.data.extractionId : '';
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
        status: TaskExtractionStatuses.TEXT_ANALYSIS,
      });

      const ocrResult = extraction.ocrExtractionResult as { text?: string; document_type?: string };
      const extractedText = typeof ocrResult.text === 'string' ? ocrResult.text : '';
      if (!extractedText.trim()) {
        await TaskExtractionRepository.updateById(extraction.id, {
          status: TaskExtractionStatuses.ERROR,
          analysisResult: 'Empty OCR text.',
        });
        logger.info(
          { extractionId, jobId: job.id },
          'LLM analysis worker finished with empty OCR text',
        );
        return;
      }
      
      let analysis = '';
      try {
        const task = await TaskRepository.getById(extraction.taskId);
        if (task?.gradeCriteriaId) {
          const criteria = await GradeCriteriaRepository.getById(task.gradeCriteriaId);
          if (criteria) {
            const prompt = buildGradeCriteriaPrompt(criteria, extractedText);
            analysis = await llmClientInstance.analyzeWithPrompt(prompt);
          }
        }
      } catch (promptError) {
        logger.warn(
          { extractionId, jobId: job.id, err: promptError },
          'Failed to build grade criteria prompt, falling back to default analysis',
        );
      }

      if (!analysis) {
        analysis = await llmClientInstance.analyzeText(
          extractedText,
          ocrResult.document_type ?? 'auto',
        );
      }

      await TaskExtractionRepository.updateById(extraction.id, {
        status: TaskExtractionStatuses.DONE,
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
