import type { Request, Response } from 'express';

import {
  listTaskExtractionsUseCase,
  saveTaskExtractionUseCase,
} from '@/application/usecases/extractions';
import { TaskExtractionRepository } from '@/infra/db/repositories';

export const saveTaskExtractionController = async (req: Request, res: Response) => {
  const taskId =
    typeof req.body?.task_id === 'string'
      ? req.body.task_id
      : typeof req.query?.task_id === 'string'
        ? req.query.task_id
        : '';
  const ocrExtractionResult =
    typeof req.body?.ocr_extraction_result === 'string' ? req.body.ocr_extraction_result : '';
  const analysisResult =
    typeof req.body?.analysis_result === 'string' ? req.body.analysis_result : '';
  const filename = typeof req.body?.filename === 'string' ? req.body.filename : '';

  if (!taskId || !ocrExtractionResult || !filename) {
    return res.status(400).json({
      error: 'task_id, ocr_extraction_result e filename são obrigatórios.',
    });
  }

  try {
    const created = await saveTaskExtractionUseCase({
      taskId,
      ocrExtractionResult,
      analysisResult,
      filename,
    });
    return res.status(201).json({
      id: created.id,
      task_id: created.taskId,
      ocr_extraction_result: created.ocrExtractionResult,
      analysis_result: created.analysisResult,
      filename: created.filename,
      created_at: created.createdAt,
      updated_at: created.updatedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao salvar extração.';
    return res.status(400).json({ error: message });
  }
};

export const listTaskExtractionsController = async (req: Request, res: Response) => {
  const taskId =
    typeof req.query?.task_id === 'string'
      ? req.query.task_id
      : typeof req.body?.task_id === 'string'
        ? req.body.task_id
        : '';

  if (!taskId) {
    return res.status(400).json({ error: 'task_id é obrigatório.' });
  }

  try {
    const extractions = await listTaskExtractionsUseCase(taskId);
    return res.json({
      items: extractions.map((extraction) => ({
        id: extraction.id,
        task_id: extraction.taskId,
        ocr_extraction_result: extraction.ocrExtractionResult,
        analysis_result: extraction.analysisResult,
        filename: extraction.filename,
        created_at: extraction.createdAt,
        updated_at: extraction.updatedAt,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao listar extrações.';
    return res.status(400).json({ error: message });
  }
};

export const getTaskExtractionController = async (req: Request, res: Response) => {
  const id = typeof req.params?.id === 'string' ? req.params.id : '';

  if (!id) {
    return res.status(400).json({ error: 'id é obrigatório.' });
  }

  try {
    const extraction = await TaskExtractionRepository.getById(id);
    if (!extraction) {
      return res.status(404).json({ error: 'Análise não encontrada.' });
    }
    return res.json({
      id: extraction.id,
      task_id: extraction.taskId,
      ocr_extraction_result: extraction.ocrExtractionResult,
      analysis_result: extraction.analysisResult,
      filename: extraction.filename,
      created_at: extraction.createdAt,
      updated_at: extraction.updatedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar análise.';
    return res.status(400).json({ error: message });
  }
};
