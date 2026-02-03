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
  const bearerToken =
    authHeader && authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
  const queryToken = typeof req.query?.token === 'string' ? req.query.token : '';
  const token = bearerToken || queryToken;

  if (!token) {
    return res.status(401).json({ error: 'Token de autenticação ausente.' });
  }
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
