import { describe, expect, it } from 'vitest';

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
