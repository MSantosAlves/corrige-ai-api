import type { Request, Response } from 'express';

import { createTaskUseCase, listTasksUseCase } from '@/application/usecases';

export const createTaskController = async (req: Request, res: Response) => {
  const classId =
    typeof req.body?.class_id === 'string'
      ? req.body.class_id
      : typeof req.query?.class_id === 'string'
        ? req.query.class_id
        : '';
  const title = typeof req.body?.title === 'string' ? req.body.title : '';
  const description = typeof req.body?.description === 'string' ? req.body.description : '';

  if (!classId || !title) {
    return res.status(400).json({ error: 'class_id e title são obrigatórios.' });
  }

  try {
    const created = await createTaskUseCase({
      classId,
      title,
      description: description || undefined,
    });
    return res.status(201).json({
      id: created.id,
      class_id: created.classId,
      title: created.title,
      description: created.description,
      created_at: created.createdAt,
      updated_at: created.updatedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar tarefa.';
    return res.status(400).json({ error: message });
  }
};

export const listTasksController = async (req: Request, res: Response) => {
  const classId =
    typeof req.query?.class_id === 'string'
      ? req.query.class_id
      : typeof req.body?.class_id === 'string'
        ? req.body.class_id
        : '';

  if (!classId) {
    return res.status(400).json({ error: 'class_id é obrigatório.' });
  }

  try {
    const tasks = await listTasksUseCase(classId);
    return res.json({
      items: tasks.map((task) => ({
        id: task.id,
        class_id: task.classId,
        title: task.title,
        description: task.description,
        created_at: task.createdAt,
        updated_at: task.updatedAt,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao listar tarefas.';
    return res.status(400).json({ error: message });
  }
};
