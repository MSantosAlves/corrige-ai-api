import type { NextFunction, Request, Response } from 'express';
import { fromNodeHeaders } from 'better-auth/node';

import { auth } from '@/infra/auth/better-auth';

type AuthUser = {
  id: string;
  email?: string;
  name?: string;
  emailVerified?: boolean;
};

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session?.user) {
      return res.status(401).json({ error: 'Sessão inválida.' });
    }

    if (!session.user.emailVerified) {
      return res.status(403).json({ error: 'E-mail não verificado.', type: 'EMAIL_NOT_VERIFIED' });
    }

    req.user = {
      id: session.user.id,
      email: session.user.email ?? undefined,
      name: session.user.name ?? undefined,
      emailVerified: session.user.emailVerified,
    } satisfies AuthUser;
    return next();
  } catch {
    return res.status(401).json({ error: 'Sessão inválida.', type: 'INVALID_SESSION' });
  }
};
