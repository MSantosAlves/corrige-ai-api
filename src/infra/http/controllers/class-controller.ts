import type { Request, Response } from 'express';

import { createClassUseCase, listClassesUseCase } from '@/application/usecases/classes';

export const createClassController = async (req: Request, res: Response) => {
  const name = typeof req.body?.name === 'string' ? req.body.name : '';
  const userId =
    typeof req.body?.user_id === 'string'
      ? req.body.user_id
      : typeof req.query?.user_id === 'string'
        ? req.query.user_id
        : '';

  if (!name || !userId) {
    return res.status(400).json({ error: 'name e user_id são obrigatórios.' });
  }

  try {
    const created = await createClassUseCase({ name, userId });
    return res.status(201).json({
      id: created.id,
      name: created.name,
      user_id: created.userId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar turma.';
    return res.status(400).json({ error: message });
  }
};

export const listClassesController = async (req: Request, res: Response) => {
  const userId =
    typeof req.query?.user_id === 'string'
      ? req.query.user_id
      : typeof req.body?.user_id === 'string'
        ? req.body.user_id
        : '';

  if (!userId) {
    return res.status(400).json({ error: 'user_id é obrigatório.' });
  }

  try {
    const classes = await listClassesUseCase(userId);
    return res.json({
      items: classes.map((classItem) => ({
        id: classItem.id,
        name: classItem.name,
        user_id: classItem.userId,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao listar turmas.';
    return res.status(400).json({ error: message });
  }
};
