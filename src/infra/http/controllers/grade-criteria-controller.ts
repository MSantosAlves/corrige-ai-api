import type { Request, Response } from 'express';

import {
  attachGradeCriteriaToTaskUseCase,
  createGradeCriteriaUseCase,
  listGradeCriteriaUseCase,
} from '@/application/usecases';
import { GradeCriteriaClassification } from '@/domain/entities';

const getUserIdFromAuth = (req: Request): string => {
  const authUser = (req as Request & { user?: { id?: string } }).user;
  if (authUser?.id) {
    return authUser.id;
  }
  const tokenUserId = typeof req.query?.user_id === 'string' ? req.query.user_id : '';
  return tokenUserId;
};

export const createGradeCriteriaController = async (req: Request, res: Response) => {
  const userId = getUserIdFromAuth(req);
  const name = typeof req.body?.name === 'string' ? req.body.name : '';
  const description = typeof req.body?.description === 'string' ? req.body.description : undefined;
  const classification =
    typeof req.body?.classification === 'string' ? req.body.classification : '';
  const isPublic = typeof req.body?.is_public === 'boolean' ? req.body.is_public : false;
  const maxScore = Number(req.body?.max_score);
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const tags = Array.isArray(req.body?.tags) ? req.body.tags : undefined;

  if (!userId || !name || !classification || Number.isNaN(maxScore) || items.length === 0) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
  }

  try {
    const created = await createGradeCriteriaUseCase({
      userId,
      name,
      description,
      classification,
      isPublic,
      maxScore,
      items,
      tags,
    });
    return res.status(201).json({
      id: created.id,
      user_id: created.userId,
      name: created.name,
      description: created.description,
      classification: created.classification,
      is_public: created.isPublic,
      max_score: created.maxScore,
      items: created.items,
      tags: created.tags,
      created_at: created.createdAt,
      updated_at: created.updatedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar critérios.';
    return res.status(400).json({ error: message });
  }
};

export const listGradeCriteriaController = async (req: Request, res: Response) => {
  const classification =
    typeof req.query?.classification === 'string' ? req.query.classification : undefined;
  const includePublic =
    typeof req.query?.include_public === 'string' ? req.query.include_public === 'true' : true;
  const userId = getUserIdFromAuth(req);

  try {
    const items = await listGradeCriteriaUseCase({
      classification: classification as GradeCriteriaClassification | undefined,
      userId: userId || undefined,
      includePublic,
    });
    return res.json({
      items: items.map((criteria) => ({
        id: criteria.id,
        user_id: criteria.userId,
        name: criteria.name,
        description: criteria.description,
        classification: criteria.classification,
        is_public: criteria.isPublic,
        max_score: criteria.maxScore,
        items: criteria.items,
        tags: criteria.tags,
        created_at: criteria.createdAt,
        updated_at: criteria.updatedAt,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao listar critérios.';
    return res.status(400).json({ error: message });
  }
};

export const attachGradeCriteriaToTaskController = async (req: Request, res: Response) => {
  const taskId = typeof req.params?.id === 'string' ? req.params.id : '';
  const classification =
    typeof req.body?.classification === 'string' ? req.body.classification : '';
  const gradeCriteriaId =
    typeof req.body?.grade_criteria_id === 'string' ? req.body.grade_criteria_id : '';
  const userId = getUserIdFromAuth(req);

  if (!taskId || !classification || !gradeCriteriaId) {
    return res
      .status(400)
      .json({ error: 'task_id, classification e grade_criteria_id são obrigatórios.' });
  }

  try {
    const updated = await attachGradeCriteriaToTaskUseCase({
      taskId,
      gradeCriteriaId,
      userId,
    });

    return res.json({
      id: updated.id,
      class_id: updated.classId,
      title: updated.title,
      description: updated.description,
      classification: updated.classification,
      grade_criteria_id: updated.gradeCriteriaId,
      created_at: updated.createdAt,
      updated_at: updated.updatedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao associar critério.';
    return res.status(400).json({ error: message });
  }
};
