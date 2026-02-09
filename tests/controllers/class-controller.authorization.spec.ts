import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/application/usecases/classes', () => ({
  createClassUseCase: vi.fn(),
  listClassesUseCase: vi.fn(),
}));

import { createClassUseCase, listClassesUseCase } from '@/application/usecases/classes';
import {
  createClassController,
  listClassesController,
} from '@/infra/http/controllers/class-controller';
import { createRequest, createResponse } from '../helpers/http';

describe('Class controllers authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /classes uses authenticated user and ignores client user_id', async () => {
    vi.mocked(createClassUseCase).mockResolvedValue({
      id: '1',
      name: 'Turma',
      userId: 'user-a',
    });

    const req = createRequest({
      user: { id: 'user-a' },
      body: { name: 'Turma', user_id: 'user-b' },
      query: { user_id: 'user-b' },
    });
    const res = createResponse();

    await createClassController(req as never, res as never);

    expect(createClassUseCase).toHaveBeenCalledWith({ name: 'Turma', userId: 'user-a' });
  });

  it('GET /classes uses authenticated user and ignores client user_id', async () => {
    vi.mocked(listClassesUseCase).mockResolvedValue([]);

    const req = createRequest({
      user: { id: 'user-a' },
      query: { user_id: 'user-b' },
    });
    const res = createResponse();

    await listClassesController(req as never, res as never);

    expect(listClassesUseCase).toHaveBeenCalledWith('user-a');
  });
});
