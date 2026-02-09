import type { Request } from 'express';
import { z } from 'zod';

import {
  OCRClient,
  OCRServiceError,
  type OCRDocumentType,
} from '@/infra/providers/ocr/ocr-client';
import { saveTaskExtractionUseCase } from '@/application/usecases/extractions';
import { LlmClient } from '@/infra/providers/llm/llm-client';
import { GradeCriteriaRepository, TaskRepository, UserRepository } from '@/infra/db/repositories';
import { buildGradeCriteriaPrompt } from '@/infra/providers/llm/prompts/grade-criteria';
import { assertTaskOwnedByUser } from '@/application/usecases/shared/ownership';
import { objectIdSchema } from '@/shared/validation';
import {
  buildBlockedExtractionResult,
  getOcrBlockingInfoFromErrorPayload,
  INVALID_CONTENT_PT_BR,
  MALICIOUS_CONTENT_PT_BR,
} from './ocr-blocking.js';

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

  if (taskId) {
    await assertTaskOwnedByUser(taskId, userId);
  }
  await UserRepository.assertNotBlocked(userId);

  let reservedQuota = false;
  let reservedUserUsage = 0;
  let reservedUserQuota = 0;
  let userBlockState: { isBlocked: boolean; blockInfo: Record<string, unknown> | null } = {
    isBlocked: false,
    blockInfo: null,
  };

  try {
    const reservedUser = await UserRepository.reservePlanUsage({ id: userId, amount: 1 });
    reservedQuota = true;
    reservedUserUsage = reservedUser.planUsage;
    reservedUserQuota = reservedUser.planQuota;
    userBlockState = {
      isBlocked: reservedUser.isBlocked,
      blockInfo: reservedUser.blockInfo,
    };

    let ocrResponse: Awaited<ReturnType<typeof ocrClientInstance.extract>>;
    try {
      ocrResponse = await ocrClientInstance.extract({
        fileName: file.originalname,
        data: file.buffer,
        documentType: documentType as OCRDocumentType,
        language,
        preserveLayout,
        qualityThreshold,
      });
    } catch (error) {
      if (error instanceof OCRServiceError) {
        const blockingInfo = getOcrBlockingInfoFromErrorPayload(error.payload);
        if (blockingInfo.blockedByOcr) {
          const analysis = blockingInfo.isMalicious
            ? MALICIOUS_CONTENT_PT_BR
            : INVALID_CONTENT_PT_BR;
          const blockedExtractionResult = buildBlockedExtractionResult({
            blockingInfo,
            rawError: error.payload?.error ?? { message: error.message },
          });

          let extractionId: string | null = null;
          if (taskId) {
            try {
              const extraction = await saveTaskExtractionUseCase({
                userId,
                taskId,
                ocrExtractionResult: blockedExtractionResult,
                analysisResult: analysis,
                filename: file.originalname,
              });
              extractionId = extraction.id;
            } catch (saveError) {
              console.error('Erro ao salvar extração bloqueada no banco:', saveError);
            }
          }

          if (blockingInfo.isMalicious) {
            await UserRepository.blockByOcr({
              id: userId,
              extractionId: extractionId ?? 'unknown_extraction',
              blockedCategory: blockingInfo.blockedCategory ?? 'malicious_content',
              blockedReason: blockingInfo.blockedReason ?? 'Documento bloqueado por classificador.',
            });
            userBlockState = {
              isBlocked: true,
              blockInfo: {
                extractionId: extractionId ?? 'unknown_extraction',
                blockedCategory: blockingInfo.blockedCategory ?? 'malicious_content',
                blockedReason:
                  blockingInfo.blockedReason ?? 'Documento bloqueado por classificador.',
                blockedAt: new Date().toISOString(),
              },
            };
          }

          return {
            ...blockedExtractionResult,
            analysis,
            planUsage: reservedUserUsage,
            planQuota: reservedUserQuota,
            user: userBlockState,
          };
        }
      }
      throw error;
    }

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

    return {
      ...ocrResponse,
      analysis,
      planUsage: reservedUserUsage,
      planQuota: reservedUserQuota,
      user: userBlockState,
    };
  } catch (error) {
    if (reservedQuota) {
      try {
        await UserRepository.rollbackPlanUsage({ id: userId, amount: 1 });
      } catch (rollbackError) {
        console.error('Erro ao reverter consumo de plano após falha.', rollbackError);
      }
    }
    throw error;
  }
};
