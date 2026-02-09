import { describe, expect, it, vi } from 'vitest';

vi.mock('@/infra/http/controllers', () => ({
  createClassController: vi.fn(),
  createTaskController: vi.fn(),
  extractTextController: vi.fn(),
  listClassesController: vi.fn(),
  listTasksController: vi.fn(),
  saveTaskExtractionController: vi.fn(),
  listTaskExtractionsController: vi.fn(),
  getTaskExtractionController: vi.fn(),
  createBulkTaskExtractionsController: vi.fn(),
  pollBulkTaskExtractionsController: vi.fn(),
  streamBulkTaskExtractionsController: vi.fn(),
  createGradeCriteriaController: vi.fn(),
  listGradeCriteriaController: vi.fn(),
  attachGradeCriteriaToTaskController: vi.fn(),
}));

import { authMiddleware } from '@/infra/http/middlewares';
import { appRouter } from '@/infra/http/routes';

type Layer = {
  handle?: unknown;
  route?: {
    path: string;
  };
};

describe('Route auth protection', () => {
  it('registers auth middleware before protected routes', () => {
    const stack = ((appRouter as unknown as { stack?: Layer[] }).stack ?? []) as Layer[];
    const authLayerIndex = stack.findIndex((layer) => layer.handle === authMiddleware);
    const protectedRouteIndex = stack.findIndex((layer) => layer.route?.path === '/classes');

    expect(authLayerIndex).toBeGreaterThanOrEqual(0);
    expect(protectedRouteIndex).toBeGreaterThan(authLayerIndex);
  });
});
