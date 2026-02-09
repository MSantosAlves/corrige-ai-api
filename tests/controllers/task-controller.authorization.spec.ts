import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/application/usecases', () => ({
  createTaskUseCase: vi.fn(),
  listTasksUseCase: vi.fn(),
}));

import { createTaskUseCase, listTasksUseCase } from '@/application/usecases';
import { createTaskController, listTasksController } from '@/infra/http/controllers/task-controller';
import { createRequest, createResponse } from '../helpers/http';

describe('Task controllers authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /tasks passes req.user.id for ownership validation', async () => {
    vi.mocked(createTaskUseCase).mockResolvedValue({
      id: 'task-1',
      classId: 'class-b',
      title: 'Task',
      description: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const req = createRequest({
      user: { id: 'user-a' },
      body: { class_id: 'class-b', title: 'Task' },
    });
    const res = createResponse();

    await createTaskController(req as never, res as never);

    expect(createTaskUseCase).toHaveBeenCalledWith({
      userId: 'user-a',
      classId: 'class-b',
      title: 'Task',
      description: undefined,
    });
  });

  it('GET /tasks passes req.user.id for ownership validation', async () => {
    vi.mocked(listTasksUseCase).mockResolvedValue([]);

    const req = createRequest({
      user: { id: 'user-a' },
      query: { class_id: 'class-b' },
    });
    const res = createResponse();

    await listTasksController(req as never, res as never);

    expect(listTasksUseCase).toHaveBeenCalledWith({ classId: 'class-b', userId: 'user-a' });
  });
});
