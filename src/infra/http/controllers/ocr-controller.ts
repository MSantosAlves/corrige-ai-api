import type { Request, Response } from 'express';

import { extractTextUseCase } from '@/application/usecases/ocr';

export const extractTextController = async (req: Request, res: Response) => {
  try {
    const result = await extractTextUseCase(req);
    return res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro inesperado.';
    return res.status(500).json({ error: message });
  }
};
