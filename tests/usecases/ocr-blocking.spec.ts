import { beforeEach, describe, expect, it, vi } from 'vitest';

const { extractMock, saveTaskExtractionMock, blockByOcrMock } = vi.hoisted(() => ({
  extractMock: vi.fn(),
  saveTaskExtractionMock: vi.fn(),
  blockByOcrMock: vi.fn(),
}));

vi.mock('@/infra/providers/ocr/ocr-client', () => {
  class OCRServiceError extends Error {
    statusCode: number;
    payload: Record<string, unknown> | null;

    constructor(message: string, statusCode: number, payload: Record<string, unknown> | null) {
      super(message);
      this.name = 'OCRServiceError';
      this.statusCode = statusCode;
      this.payload = payload;
    }
  }

  return {
    OCRClient: vi.fn().mockImplementation(() => ({
      extract: extractMock,
    })),
    OCRServiceError,
  };
});

vi.mock('@/infra/providers/llm/llm-client', () => ({
  LlmClient: vi.fn().mockImplementation(() => ({
    analyzeWithPrompt: vi.fn(),
    analyzeText: vi.fn(),
  })),
}));

vi.mock('@/application/usecases/extractions', () => ({
  saveTaskExtractionUseCase: saveTaskExtractionMock,
}));

vi.mock('@/application/usecases/shared/ownership', () => ({
  assertTaskOwnedByUser: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/infra/db/repositories', () => ({
  UserRepository: {
    assertNotBlocked: vi.fn().mockResolvedValue(undefined),
    reservePlanUsage: vi.fn().mockResolvedValue({
      id: 'user-a',
      name: 'A',
      email: 'a@example.com',
      password: '',
      planType: 'FREE',
      planQuota: 10,
      planUsage: 1,
      isBlocked: false,
      blockInfo: null,
    }),
    rollbackPlanUsage: vi.fn(),
    blockByOcr: blockByOcrMock,
  },
  TaskRepository: {
    getById: vi.fn(),
  },
  GradeCriteriaRepository: {
    getById: vi.fn(),
  },
}));

import { OCRServiceError } from '@/infra/providers/ocr/ocr-client';
import { extractTextUseCase } from '@/application/usecases/ocr/extract-text';
import { UserRepository } from '@/infra/db/repositories';

describe('OCR classifier blocking handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(UserRepository.reservePlanUsage).mockResolvedValue({
      id: 'user-a',
      name: 'A',
      email: 'a@example.com',
      password: '',
      planType: 'FREE',
      planQuota: 10,
      planUsage: 1,
      isBlocked: false,
      blockInfo: null,
    });
    vi.mocked(UserRepository.assertNotBlocked).mockResolvedValue(undefined);
    saveTaskExtractionMock.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      taskId: '507f1f77bcf86cd799439012',
      status: 'ERROR',
      filename: 'essay.pdf',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  it('returns an invalid-content message for non_related_content', async () => {
    extractMock.mockRejectedValue(
      new OCRServiceError('Document rejected', 400, {
        error: {
          code: 'DOCUMENT_REJECTED_BY_CLASSIFIER',
          message: 'Document rejected by content classifier',
          details: {
            blocked_category: 'non_related_content',
            classifier_reasoning: 'Imagem sem contexto educacional.',
          },
        },
      }),
    );

    const result = await extractTextUseCase({
      user: { id: 'user-a' },
      body: { task_id: '507f1f77bcf86cd799439012' },
      file: { originalname: 'essay.pdf', buffer: Buffer.from('content') },
    } as never);

    expect(result.analysis).toContain('Conteúdo inválido para extração');
    expect(result.blocked_by_ocr).toBe(true);
    expect(blockByOcrMock).not.toHaveBeenCalled();
    expect(UserRepository.rollbackPlanUsage).not.toHaveBeenCalled();
  });

  it('blocks the user when category is malicious_content', async () => {
    extractMock.mockRejectedValue(
      new OCRServiceError('Document rejected', 400, {
        error: {
          code: 'DOCUMENT_REJECTED_BY_CLASSIFIER',
          message: 'Document rejected by content classifier',
          details: {
            blocked_category: 'malicious_content',
            classifier_reasoning: 'Payload potencialmente malicioso.',
          },
        },
      }),
    );

    await extractTextUseCase({
      user: { id: 'user-a' },
      body: { task_id: '507f1f77bcf86cd799439012' },
      file: { originalname: 'essay.pdf', buffer: Buffer.from('content') },
    } as never);

    expect(blockByOcrMock).toHaveBeenCalledTimes(1);
    expect(blockByOcrMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-a',
        extractionId: '507f1f77bcf86cd799439011',
        blockedCategory: 'malicious_content',
      }),
    );
  });
});
