import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/application/usecases/shared/ownership', () => ({
  assertTaskOwnedByUser: vi.fn(),
}));

vi.mock('@/infra/db/repositories', () => ({
  UserRepository: {
    findById: vi.fn(),
    incrementPlanUsage: vi.fn(),
  },
  TaskRepository: {
    getById: vi.fn(),
    update: vi.fn(),
  },
  GradeCriteriaRepository: {
    getById: vi.fn(),
  },
}));

vi.mock('@/application/usecases/extractions', () => ({
  saveTaskExtractionUseCase: vi.fn(),
}));

vi.mock('@/infra/providers/ocr/ocr-client', () => ({
  OCRClient: vi.fn().mockImplementation(() => ({
    extract: vi.fn(),
  })),
}));

vi.mock('@/infra/providers/llm/llm-client', () => ({
  LlmClient: vi.fn().mockImplementation(() => ({
    analyzeWithPrompt: vi.fn(),
    analyzeText: vi.fn(),
  })),
}));

import { assertTaskOwnedByUser } from '@/application/usecases/shared/ownership';
import { GradeCriteriaRepository, TaskRepository, UserRepository } from '@/infra/db/repositories';
import { extractTextUseCase } from '@/application/usecases/ocr/extract-text';
import { attachGradeCriteriaToTaskUseCase } from '@/application/usecases/criteria/attach-grade-criteria-to-task';

describe('Authorization enforcement in usecases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('denies /extract-text when task belongs to another user', async () => {
    vi.mocked(UserRepository.findById).mockResolvedValue({
      id: 'user-a',
      name: 'A',
      email: 'a@example.com',
      password: '',
      planType: 'FREE',
      planQuota: 10,
      planUsage: 0,
      isBlocked: false,
      blockInfo: null,
    });
    vi.mocked(assertTaskOwnedByUser).mockRejectedValue(
      new Error('Recurso não encontrado ou sem permissão.'),
    );

    const req = {
      user: { id: 'user-a' },
      body: { task_id: '507f1f77bcf86cd799439011' },
      file: { originalname: 'a.pdf', buffer: Buffer.from('test') },
    };

    await expect(extractTextUseCase(req as never)).rejects.toThrow(
      'Recurso não encontrado ou sem permissão.',
    );
    expect(assertTaskOwnedByUser).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      'user-a',
    );
  });

  it('denies criteria attachment when target task belongs to another user', async () => {
    vi.mocked(assertTaskOwnedByUser).mockRejectedValue(
      new Error('Recurso não encontrado ou sem permissão.'),
    );
    vi.mocked(GradeCriteriaRepository.getById).mockResolvedValue({
      id: 'criteria-1',
      userId: 'user-a',
      name: 'Critério',
      classification: 'ENEM',
      isPublic: true,
      maxScore: 10,
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await expect(
      attachGradeCriteriaToTaskUseCase({
        taskId: '507f1f77bcf86cd799439011',
        gradeCriteriaId: '507f1f77bcf86cd799439012',
        userId: '507f1f77bcf86cd799439013',
      }),
    ).rejects.toThrow('Recurso não encontrado ou sem permissão.');
    expect(TaskRepository.update).not.toHaveBeenCalled();
  });
});
