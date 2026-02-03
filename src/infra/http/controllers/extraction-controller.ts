import type { Request, Response } from 'express';
import type { MulterFile } from '@/infra/http/types/multer';

import {
  createBulkTaskExtractionsUseCase,
  getBulkTaskExtractionsUseCase,
  listTaskExtractionsUseCase,
  saveTaskExtractionUseCase,
} from '@/application/usecases/extractions';
import { TaskExtractionBatchStatuses, TaskExtractionStatuses } from '@/domain/entities';
import { TaskExtractionRepository } from '@/infra/db/repositories';
import { logger } from '@/shared/logger';

type MulterRequestFiles = MulterFile[] | { [fieldname: string]: MulterFile[] } | undefined;

type MulterRequest = Request & {
  files?: MulterRequestFiles;
};

export const createBulkTaskExtractionsController = async (req: MulterRequest, res: Response) => {
  const taskId = typeof req.body?.task_id === 'string' ? req.body.task_id : '';
  const files: MulterFile[] = Array.isArray(req.files)
    ? req.files
    : req.files && typeof req.files === 'object'
      ? Object.values(req.files as Record<string, MulterFile[]>).flat()
      : [];

  if (!taskId || files.length === 0) {
    return res.status(400).json({ error: 'task_id e files são obrigatórios.' });
  }

  try {
    const result = await createBulkTaskExtractionsUseCase({
      taskId,
      files: files.map((file) => ({
        originalname: file.originalname,
        buffer: file.buffer,
      })),
      documentType:
        typeof req.body?.document_type === 'string' ? req.body.document_type : undefined,
      language: typeof req.body?.language === 'string' ? req.body.language : undefined,
      preserveLayout:
        typeof req.body?.preserve_layout === 'string'
          ? req.body.preserve_layout === 'true'
          : typeof req.body?.preserve_layout === 'boolean'
            ? req.body.preserve_layout
            : undefined,
      qualityThreshold:
        typeof req.body?.quality_threshold === 'number'
          ? req.body.quality_threshold
          : typeof req.body?.quality_threshold === 'string'
            ? Number(req.body.quality_threshold)
            : undefined,
    });

    return res.status(202).json({
      batch_id: result.batchId,
      job_id: result.ocrJobId,
      status: result.status,
      items: result.items.map((item) => ({
        id: item.id,
        task_id: item.taskId,
        batch_id: item.batchId,
        status: item.status,
        ocr_result_id: item.ocrResultId,
        filename: item.filename,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar extrações em lote.';
    return res.status(400).json({ error: message });
  }
};

export const pollBulkTaskExtractionsController = async (req: Request, res: Response) => {
  const batchId = typeof req.params?.batchId === 'string' ? req.params.batchId : '';

  if (!batchId) {
    return res.status(400).json({ error: 'batchId é obrigatório.' });
  }

  try {
    const result = await getBulkTaskExtractionsUseCase(batchId);
    return res.json({
      batch_id: result.batchId,
      job_id: result.ocrJobId,
      status: result.status,
      items: result.items.map((item) => ({
        id: item.id,
        task_id: item.taskId,
        batch_id: item.batchId,
        status: item.status,
        ocr_result_id: item.ocrResultId,
        ocr_extraction_result: item.ocrExtractionResult,
        analysis_result: item.analysisResult,
        filename: item.filename,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao consultar extrações em lote.';
    return res.status(400).json({ error: message });
  }
};

export const streamBulkTaskExtractionsController = async (req: Request, res: Response) => {
  const batchId = typeof req.params?.batchId === 'string' ? req.params.batchId : '';

  if (!batchId) {
    return res.status(400).json({ error: 'batchId é obrigatório.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const pollIntervalMs = 3000;

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const poll = async () => {
    try {
      const result = await getBulkTaskExtractionsUseCase(batchId);
      const totalCount = result.items.length;
      const completedCount = result.items.filter(
        (item) =>
          item.status === TaskExtractionStatuses.DONE ||
          item.status === TaskExtractionStatuses.ERROR,
      ).length;
      const payload = {
        batch_id: result.batchId,
        job_id: result.ocrJobId,
        status: result.status,
        progress: {
          completed: completedCount,
          total: totalCount,
        },
      };
      sendEvent('status', payload);

      if (
        result.status === TaskExtractionBatchStatuses.DONE ||
        result.status === TaskExtractionBatchStatuses.ERROR
      ) {
        sendEvent('done', payload);
        cleanup();
        res.end();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao consultar extrações.';
      sendEvent('error', { error: message });
      cleanup();
      res.end();
    }
  };

  const intervalId = setInterval(poll, pollIntervalMs);
  const keepAliveId = setInterval(() => {
    res.write('event: ping\n');
    res.write('data: {}\n\n');
  }, 15000);

  const cleanup = () => {
    clearInterval(intervalId);
    clearInterval(keepAliveId);
  };

  req.on('close', () => {
    cleanup();
  });

  poll().catch((error) => {
    logger.error({ err: error, batchId }, 'Failed to start bulk extraction stream');
  });
};

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
