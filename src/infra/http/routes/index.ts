import express, { Router } from 'express';
import multer from 'multer';

import {
  createClassController,
  createTaskController,
  extractTextController,
  listClassesController,
  listTasksController,
  signInController,
  signUpController,
  saveTaskExtractionController,
  listTaskExtractionsController,
  getTaskExtractionController,
  createBulkTaskExtractionsController,
  pollBulkTaskExtractionsController,
  streamBulkTaskExtractionsController,
  createGradeCriteriaController,
  listGradeCriteriaController,
  attachGradeCriteriaToTaskController,
} from '@/infra/http/controllers';
import {
  authMiddleware,
  globalRateLimiter,
  llmRateLimiter,
  publicHourlyRateLimiter,
  publicRateLimiter,
} from '@/infra/http/middlewares';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/health', publicRateLimiter, publicHourlyRateLimiter, (_req, res) => {
  res.status(200).send('OK');
});

router.get('/', publicRateLimiter, publicHourlyRateLimiter, (_req, res) => {
  res.status(200).send('OK');
});

router.post('/auth/sign-in', publicRateLimiter, publicHourlyRateLimiter, signInController);
router.post('/auth/sign-up', publicRateLimiter, publicHourlyRateLimiter, signUpController);

router.use(authMiddleware);
router.use(globalRateLimiter);

router.post('/extract-text', llmRateLimiter, upload.single('file'), extractTextController);
router.post('/classes', createClassController);
router.get('/classes', listClassesController);
router.post('/criteria', createGradeCriteriaController);
router.get('/criteria', listGradeCriteriaController);
router.post('/tasks', createTaskController);
router.get('/tasks', listTasksController);
router.post('/tasks/:id/criteria', attachGradeCriteriaToTaskController);
router.post('/extractions', saveTaskExtractionController);
router.post(
  '/extractions/bulk',
  llmRateLimiter,
  upload.array('files'),
  createBulkTaskExtractionsController as express.RequestHandler,
);
router.get(
  '/extractions/bulk/:batchId',
  pollBulkTaskExtractionsController as express.RequestHandler,
);
router.get(
  '/extractions/bulk/:batchId/events',
  streamBulkTaskExtractionsController as express.RequestHandler,
);
router.get('/extractions', listTaskExtractionsController);
router.get('/extractions/:id', getTaskExtractionController);

export { router as appRouter };
