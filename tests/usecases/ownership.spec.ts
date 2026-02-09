import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/infra/db/repositories', () => ({
  ClassRepository: {
    getById: vi.fn(),
  },
  TaskRepository: {
    getById: vi.fn(),
  },
  TaskExtractionBatchRepository: {
    getById: vi.fn(),
  },
  TaskExtractionRepository: {
    getById: vi.fn(),
  },
}));

import {
  ClassRepository,
  TaskExtractionBatchRepository,
  TaskExtractionRepository,
  TaskRepository,
} from '@/infra/db/repositories';
import {
  assertBatchOwnedByUser,
  assertClassOwnedByUser,
  assertExtractionOwnedByUser,
  assertTaskOwnedByUser,
} from '@/application/usecases/shared/ownership';

describe('Ownership guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('denies class access when owner mismatches', async () => {
    vi.mocked(ClassRepository.getById).mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      name: 'Turma B',
      userId: '507f1f77bcf86cd799439012',
    });

    await expect(
      assertClassOwnedByUser('507f1f77bcf86cd799439011', '507f1f77bcf86cd799439013'),
    ).rejects.toThrow('Recurso não encontrado ou sem permissão.');
  });

  it('denies task access when task class belongs to another user', async () => {
    vi.mocked(TaskRepository.getById).mockResolvedValue({
      id: '507f1f77bcf86cd799439021',
      classId: '507f1f77bcf86cd799439022',
      title: 'Task',
      description: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    vi.mocked(ClassRepository.getById).mockResolvedValue({
      id: '507f1f77bcf86cd799439022',
      name: 'Turma B',
      userId: '507f1f77bcf86cd799439012',
    });

    await expect(
      assertTaskOwnedByUser('507f1f77bcf86cd799439021', '507f1f77bcf86cd799439013'),
    ).rejects.toThrow('Recurso não encontrado ou sem permissão.');
  });

  it('denies batch access when linked task is not owned by user', async () => {
    vi.mocked(TaskExtractionBatchRepository.getById).mockResolvedValue({
      id: '507f1f77bcf86cd799439031',
      taskId: '507f1f77bcf86cd799439021',
      ocrJobId: 'ocr-1',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    vi.mocked(TaskRepository.getById).mockResolvedValue({
      id: '507f1f77bcf86cd799439021',
      classId: '507f1f77bcf86cd799439022',
      title: 'Task',
      description: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    vi.mocked(ClassRepository.getById).mockResolvedValue({
      id: '507f1f77bcf86cd799439022',
      name: 'Turma B',
      userId: '507f1f77bcf86cd799439012',
    });

    await expect(
      assertBatchOwnedByUser('507f1f77bcf86cd799439031', '507f1f77bcf86cd799439013'),
    ).rejects.toThrow('Recurso não encontrado ou sem permissão.');
  });

  it('denies extraction access when linked task is not owned by user', async () => {
    vi.mocked(TaskExtractionRepository.getById).mockResolvedValue({
      id: '507f1f77bcf86cd799439041',
      taskId: '507f1f77bcf86cd799439021',
      batchId: '507f1f77bcf86cd799439031',
      status: 'PENDING',
      filename: 'a.pdf',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    vi.mocked(TaskRepository.getById).mockResolvedValue({
      id: '507f1f77bcf86cd799439021',
      classId: '507f1f77bcf86cd799439022',
      title: 'Task',
      description: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    vi.mocked(ClassRepository.getById).mockResolvedValue({
      id: '507f1f77bcf86cd799439022',
      name: 'Turma B',
      userId: '507f1f77bcf86cd799439012',
    });

    await expect(
      assertExtractionOwnedByUser('507f1f77bcf86cd799439041', '507f1f77bcf86cd799439013'),
    ).rejects.toThrow('Recurso não encontrado ou sem permissão.');
  });
});
