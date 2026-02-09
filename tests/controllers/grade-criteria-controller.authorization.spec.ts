import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/application/usecases', () => ({
  attachGradeCriteriaToTaskUseCase: vi.fn(),
  createGradeCriteriaUseCase: vi.fn(),
  listGradeCriteriaUseCase: vi.fn(),
}));

import { attachGradeCriteriaToTaskUseCase } from '@/application/usecases';
import { attachGradeCriteriaToTaskController } from '@/infra/http/controllers/grade-criteria-controller';
import { createRequest, createResponse } from '../helpers/http';

describe('Grade criteria controller authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /tasks/:id/criteria uses authenticated user id for authorization', async () => {
    vi.mocked(attachGradeCriteriaToTaskUseCase).mockResolvedValue({
      id: 'task-1',
      classId: 'class-1',
      title: 'Task',
      description: '',
      classification: 'ENEM',
      gradeCriteriaId: 'criteria-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const req = createRequest({
      user: { id: 'user-a' },
      params: { id: 'task-b' },
      body: {
        classification: 'ENEM',
        grade_criteria_id: 'criteria-1',
      },
      query: { user_id: 'user-b' },
    });
    const res = createResponse();

    await attachGradeCriteriaToTaskController(req as never, res as never);

    expect(attachGradeCriteriaToTaskUseCase).toHaveBeenCalledWith({
      taskId: 'task-b',
      gradeCriteriaId: 'criteria-1',
      userId: 'user-a',
    });
  });
});
