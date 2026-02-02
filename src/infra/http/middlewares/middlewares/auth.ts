import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '@/infra/config/env';

type AuthUser = {
  id: string;
  email?: string;
  name?: string;
};

const jwtSecret = env.JWT_SECRET;

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.header('authorization');
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return res.status(401).json({ error: 'Token de autenticação ausente.' });
  }

  const token = authHeader.slice(7).trim();
  try {
    const payload = jwt.verify(token, jwtSecret) as jwt.JwtPayload;
    const userId = typeof payload.sub === 'string' ? payload.sub : '';
    if (!userId) {
      return res.status(401).json({ error: 'Token inválido.' });
    }

    req.user = {
      id: userId,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      name: typeof payload.name === 'string' ? payload.name : undefined,
    } satisfies AuthUser;
    return next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
};
