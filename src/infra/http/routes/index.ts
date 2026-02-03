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
} from '@/infra/http/controllers';
import { authMiddleware } from '@/infra/http/middlewares';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', (_req, res) => {
  res.send('Hello World');
});

router.post('/auth/sign-in', signInController);
router.post('/auth/sign-up', signUpController);

router.use(authMiddleware);

router.post('/extract-text', upload.single('file'), extractTextController);
router.post('/classes', createClassController);
router.get('/classes', listClassesController);
router.post('/tasks', createTaskController);
router.get('/tasks', listTasksController);
router.post('/extractions', saveTaskExtractionController);
router.post(
  '/extractions/bulk',
  upload.array('files'),
  createBulkTaskExtractionsController as express.RequestHandler,
);
router.get('/extractions', listTaskExtractionsController);
router.get('/extractions/:id', getTaskExtractionController);
router.get(
  '/extractions/bulk/:batchId',
  pollBulkTaskExtractionsController as express.RequestHandler,
);
router.get(
  '/extractions/bulk/:batchId/events',
  streamBulkTaskExtractionsController as express.RequestHandler,
);

export { router as appRouter };
