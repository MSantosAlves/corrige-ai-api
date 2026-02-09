import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/infra/auth/better-auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

import { auth } from '@/infra/auth/better-auth';
import { authMiddleware } from '@/infra/http/middlewares/auth';
import { createRequest, createResponse } from '../helpers/http';

describe('authMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when session is missing', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const req = createRequest({ headers: {} });
    const res = createResponse();
    const next = vi.fn();

    await authMiddleware(req as never, res as never, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when email is not verified', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: {
        id: 'user-a',
        email: 'a@example.com',
        name: 'A',
        emailVerified: false,
      },
    });

    const req = createRequest({ headers: {} });
    const res = createResponse();
    const next = vi.fn();

    await authMiddleware(req as never, res as never, next);

    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows request and sets req.user for verified session', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: {
        id: 'user-a',
        email: 'a@example.com',
        name: 'A',
        emailVerified: true,
      },
    });

    const req = createRequest({ headers: {} });
    const res = createResponse();
    const next = vi.fn();

    await authMiddleware(req as never, res as never, next);

    expect(req.user?.id).toBe('user-a');
    expect(next).toHaveBeenCalledTimes(1);
  });
});
