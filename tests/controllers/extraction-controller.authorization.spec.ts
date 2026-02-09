import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/application/usecases/extractions', () => ({
  createBulkTaskExtractionsUseCase: vi.fn(),
  getBulkTaskExtractionsUseCase: vi.fn(),
  getTaskExtractionUseCase: vi.fn(),
  listTaskExtractionsUseCase: vi.fn(),
  saveTaskExtractionUseCase: vi.fn(),
}));

vi.mock('@/infra/config/env', () => ({
  env: {
    SSE_POLL_INTERVAL_MS: 10,
    SSE_KEEPALIVE_INTERVAL_MS: 10,
  },
}));

vi.mock('@/shared/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  createBulkTaskExtractionsUseCase,
  getBulkTaskExtractionsUseCase,
  getTaskExtractionUseCase,
  listTaskExtractionsUseCase,
  saveTaskExtractionUseCase,
} from '@/application/usecases/extractions';
import {
  createBulkTaskExtractionsController,
  getTaskExtractionController,
  listTaskExtractionsController,
  pollBulkTaskExtractionsController,
  saveTaskExtractionController,
  streamBulkTaskExtractionsController,
} from '@/infra/http/controllers/extraction-controller';
import { createRequest, createResponse } from '../helpers/http';

describe('Extraction controllers authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('POST /extractions/bulk passes authenticated user id', async () => {
    vi.mocked(createBulkTaskExtractionsUseCase).mockResolvedValue({
      batchId: 'batch-1',
      ocrJobId: 'ocr-1',
      status: 'PENDING',
      items: [],
      planUsage: 1,
      planQuota: 10,
      user: {
        isBlocked: false,
        blockInfo: null,
      },
    });

    const req = createRequest({
      user: { id: 'user-a' },
      body: { task_id: 'task-b' },
      files: [{ originalname: 'a.pdf', buffer: Buffer.from('x') }],
    });
    const res = createResponse();

    await createBulkTaskExtractionsController(req as never, res as never);

    expect(createBulkTaskExtractionsUseCase).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-a',
        taskId: 'task-b',
      }),
    );
  });

  it('GET /extractions/bulk/:batchId passes user context for ownership check', async () => {
    vi.mocked(getBulkTaskExtractionsUseCase).mockResolvedValue({
      batchId: 'batch-b',
      ocrJobId: 'ocr-1',
      status: 'PROCESSING',
      items: [],
      user: {
        isBlocked: false,
        blockInfo: null,
      },
    });

    const req = createRequest({
      user: { id: 'user-a' },
      params: { batchId: 'batch-b' },
    });
    const res = createResponse();

    await pollBulkTaskExtractionsController(req as never, res as never);

    expect(getBulkTaskExtractionsUseCase).toHaveBeenCalledWith({
      batchId: 'batch-b',
      userId: 'user-a',
    });
  });

  it('GET /extractions/bulk/:batchId/events passes user context for ownership check', async () => {
    vi.mocked(getBulkTaskExtractionsUseCase).mockResolvedValue({
      batchId: 'batch-b',
      ocrJobId: 'ocr-1',
      status: 'DONE',
      items: [],
      user: {
        isBlocked: false,
        blockInfo: null,
      },
    });

    const req = createRequest({
      user: { id: 'user-a' },
      params: { batchId: 'batch-b' },
      on: vi.fn(),
    });
    const res = createResponse();

    await streamBulkTaskExtractionsController(req as never, res as never);

    expect(getBulkTaskExtractionsUseCase).toHaveBeenCalledWith({
      batchId: 'batch-b',
      userId: 'user-a',
    });
    expect(res.ended).toBe(true);
  });

  it('POST /extractions passes authenticated user id to prevent foreign writes', async () => {
    vi.mocked(saveTaskExtractionUseCase).mockResolvedValue({
      id: 'ext-1',
      taskId: 'task-b',
      status: 'PENDING',
      filename: 'a.pdf',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const req = createRequest({
      user: { id: 'user-a' },
      body: {
        task_id: 'task-b',
        ocr_extraction_result: '{}',
        analysis_result: '',
        filename: 'a.pdf',
      },
    });
    const res = createResponse();

    await saveTaskExtractionController(req as never, res as never);

    expect(saveTaskExtractionUseCase).toHaveBeenCalledWith({
      userId: 'user-a',
      taskId: 'task-b',
      ocrExtractionResult: '{}',
      analysisResult: '',
      filename: 'a.pdf',
    });
  });

  it('GET /extractions passes authenticated user id to prevent foreign reads', async () => {
    vi.mocked(listTaskExtractionsUseCase).mockResolvedValue([]);

    const req = createRequest({
      user: { id: 'user-a' },
      query: { task_id: 'task-b' },
    });
    const res = createResponse();

    await listTaskExtractionsController(req as never, res as never);

    expect(listTaskExtractionsUseCase).toHaveBeenCalledWith({
      taskId: 'task-b',
      userId: 'user-a',
    });
  });

  it('GET /extractions/:id passes authenticated user id to prevent foreign reads', async () => {
    vi.mocked(getTaskExtractionUseCase).mockResolvedValue(null);

    const req = createRequest({
      user: { id: 'user-a' },
      params: { id: 'ext-b' },
    });
    const res = createResponse();

    await getTaskExtractionController(req as never, res as never);

    expect(getTaskExtractionUseCase).toHaveBeenCalledWith({
      id: 'ext-b',
      userId: 'user-a',
    });
  });
});
