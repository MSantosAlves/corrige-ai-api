import type { Request } from 'express';
import { z } from 'zod';

import { OCRClient, type OCRDocumentType } from '@/infra/providers/ocr/ocr-client';
import { saveTaskExtractionUseCase } from '@/application/usecases/extractions';
import { LlmClient } from '@/infra/providers/llm/llm-client';
import { GradeCriteriaRepository, TaskRepository, UserRepository } from '@/infra/db/repositories';
import { buildGradeCriteriaPrompt } from '@/infra/providers/llm/prompts/grade-criteria';
import { assertTaskOwnedByUser } from '@/application/usecases/shared/ownership';
import { objectIdSchema } from '@/shared/validation';

const ocrClientInstance = new OCRClient();
const llmClientInstance = new LlmClient();

const extractBodySchema = z.object({
  user_id: objectIdSchema.optional(),
  class_id: objectIdSchema.optional(),
  task_id: objectIdSchema.optional(),
  document_type: z.enum(['pdf_native', 'printed', 'handwritten', 'auto']).optional(),
  language: z.string().optional(),
  preserve_layout: z.boolean().optional(),
  quality_threshold: z.number().min(0).max(1).optional(),
});

const extractFileSchema = z.object({
  originalname: z.string().min(1),
  buffer: z.instanceof(Buffer),
});

export const extractTextUseCase = async (req: Request) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new Error('Token de autenticação ausente.');
  }

  const body = extractBodySchema.parse(req.body ?? {});
  const file = extractFileSchema.parse(req.file);

  const {
    task_id: taskId,
    document_type: documentType,
    language,
    preserve_layout: preserveLayout,
    quality_threshold: qualityThreshold,
  } = body;

  const user = await UserRepository.findById(userId);
  if (!user) {
    throw new Error('Usuário não encontrado.');
  }
  if (user.planUsage >= user.planQuota) {
    throw new Error('Limite de uso do plano atingido.');
  }

  if (taskId) {
    await assertTaskOwnedByUser(taskId, userId);
  }

  const ocrResponse = await ocrClientInstance.extract({
    fileName: file.originalname,
    data: file.buffer,
    documentType: documentType as OCRDocumentType,
    language,
    preserveLayout,
    qualityThreshold,
  });

  let analysis = '';
  const extractedText =
    ocrResponse.text && ocrResponse.text.trim().length > 0 ? ocrResponse.text : '';
  if (extractedText) {
    try {
      if (taskId) {
        const task = await TaskRepository.getById(taskId);
        if (task?.gradeCriteriaId) {
          const criteria = await GradeCriteriaRepository.getById(task.gradeCriteriaId);
          if (criteria) {
            const prompt = buildGradeCriteriaPrompt(criteria, extractedText);
            analysis = await llmClientInstance.analyzeWithPrompt(prompt);
          }
        }
      }
    } catch (promptError) {
      console.warn('Falha ao aplicar prompt de critérios, usando análise padrão.', promptError);
    }

    if (!analysis) {
      analysis = await llmClientInstance.analyzeText(
        extractedText,
        documentType ?? ocrResponse.document_type,
      );
    }
  }

  if (taskId) {
    try {
      await saveTaskExtractionUseCase({
        userId,
        taskId,
        ocrExtractionResult: ocrResponse,
        analysisResult: typeof analysis === 'string' ? analysis : JSON.stringify(analysis),
        filename: file.originalname,
      });
    } catch (error) {
      console.error('Erro ao salvar extração no banco:', error);
    }
  }

  await UserRepository.incrementPlanUsage({ id: userId, amount: 1 });

  return {
    ...ocrResponse,
    analysis,
    planUsage: user.planUsage,
    planQuota: user.planQuota,
  };
};
