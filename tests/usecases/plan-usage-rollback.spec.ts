import { beforeEach, describe, expect, it, vi } from 'vitest';

const { extractMock, extractAsyncBulkMock } = vi.hoisted(() => ({
  extractMock: vi.fn(),
  extractAsyncBulkMock: vi.fn(),
}));

vi.mock('@/infra/providers/ocr/ocr-client', () => ({
  OCRClient: vi.fn().mockImplementation(() => ({
    extract: extractMock,
    extractAsyncBulk: extractAsyncBulkMock,
  })),
  OCRServiceError: class OCRServiceError extends Error {},
}));

vi.mock('@/infra/providers/llm/llm-client', () => ({
  LlmClient: vi.fn().mockImplementation(() => ({
    analyzeWithPrompt: vi.fn(),
    analyzeText: vi.fn(),
  })),
}));

vi.mock('@/application/usecases/extractions', () => ({
  saveTaskExtractionUseCase: vi.fn(),
}));

vi.mock('@/application/usecases/shared/ownership', () => ({
  assertTaskOwnedByUser: vi.fn(),
}));

vi.mock('@/infra/db/repositories', () => ({
  UserRepository: {
    assertNotBlocked: vi.fn(),
    blockByOcr: vi.fn(),
    reservePlanUsage: vi.fn(),
    rollbackPlanUsage: vi.fn(),
  },
  TaskRepository: {
    getById: vi.fn(),
  },
  GradeCriteriaRepository: {
    getById: vi.fn(),
  },
  TaskExtractionBatchRepository: {
    create: vi.fn(),
  },
  TaskExtractionRepository: {
    create: vi.fn(),
  },
}));

vi.mock('@/infra/queues/bulk-extraction-queue', () => ({
  enqueueBulkExtractionPoll: vi.fn(),
}));

import { UserRepository } from '@/infra/db/repositories';
import { extractTextUseCase } from '@/application/usecases/ocr/extract-text';
import { createBulkTaskExtractionsUseCase } from '@/application/usecases/extractions/create-bulk-task-extractions';
import { assertTaskOwnedByUser } from '@/application/usecases/shared/ownership';

describe('Plan usage rollback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rolls back reserved plan usage when /extract-text hard fails', async () => {
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
    vi.mocked(UserRepository.rollbackPlanUsage).mockResolvedValue({
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
    extractMock.mockRejectedValue(new Error('OCR unavailable'));

    const req = {
      user: { id: 'user-a' },
      body: {},
      file: { originalname: 'essay.pdf', buffer: Buffer.from('content') },
    };

    await expect(extractTextUseCase(req as never)).rejects.toThrow('OCR unavailable');
    expect(UserRepository.reservePlanUsage).toHaveBeenCalledWith({ id: 'user-a', amount: 1 });
    expect(UserRepository.rollbackPlanUsage).toHaveBeenCalledWith({ id: 'user-a', amount: 1 });
  });

  it('rolls back reserved plan usage when bulk extraction hard fails', async () => {
    vi.mocked(assertTaskOwnedByUser).mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      classId: '507f1f77bcf86cd799439012',
      title: 'Task',
      description: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    vi.mocked(UserRepository.reservePlanUsage).mockResolvedValue({
      id: 'user-a',
      name: 'A',
      email: 'a@example.com',
      password: '',
      planType: 'FREE',
      planQuota: 10,
      planUsage: 3,
      isBlocked: false,
      blockInfo: null,
    });
    vi.mocked(UserRepository.rollbackPlanUsage).mockResolvedValue({
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
    extractAsyncBulkMock.mockRejectedValue(new Error('OCR bulk unavailable'));

    await expect(
      createBulkTaskExtractionsUseCase({
        userId: 'user-a',
        taskId: '507f1f77bcf86cd799439011',
        files: [
          { originalname: 'a.pdf', buffer: Buffer.from('a') },
          { originalname: 'b.pdf', buffer: Buffer.from('b') },
        ],
      }),
    ).rejects.toThrow('OCR bulk unavailable');

    expect(UserRepository.reservePlanUsage).toHaveBeenCalledWith({ id: 'user-a', amount: 2 });
    expect(UserRepository.rollbackPlanUsage).toHaveBeenCalledWith({ id: 'user-a', amount: 2 });
  });
});
