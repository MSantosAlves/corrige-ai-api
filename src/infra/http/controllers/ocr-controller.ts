import type { Request, Response } from 'express';

import { extractTextUseCase } from '@/application/usecases/ocr';
import { USER_BLOCKED_ERROR } from '@/infra/db/repositories';

export const extractTextController = async (req: Request, res: Response) => {
  try {
    const result = await extractTextUseCase(req);
    return res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro inesperado.';
    if (message === USER_BLOCKED_ERROR) {
      return res.status(403).json({ error: message });
    }
    if (message === 'Limite de uso do plano atingido.') {
      return res.status(400).json({ error: message });
    }
    return res.status(500).json({ error: message });
  }
};
