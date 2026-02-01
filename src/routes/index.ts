import { Router } from "express";
import multer from "multer";

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
  getTaskExtractionController
} from "../controllers";
import { authMiddleware } from "../middlewares";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", (_req, res) => {
  res.send("Hello World");
});

router.post("/auth/sign-in", signInController);
router.post("/auth/sign-up", signUpController);

router.use(authMiddleware);

router.post("/extract-text", upload.single("file"), extractTextController);
router.post("/classes", createClassController);
router.get("/classes", listClassesController);
router.post("/tasks", createTaskController);
router.get("/tasks", listTasksController);
router.post("/extractions", saveTaskExtractionController);
router.get("/extractions", listTaskExtractionsController);
router.get("/extractions/:id", getTaskExtractionController);

export { router as appRouter };
