import {
  ClassRepository,
  TaskExtractionBatchRepository,
  TaskExtractionRepository,
  TaskRepository,
} from '@/infra/db/repositories';
import {
  type ClassEntity,
  type TaskEntity,
  type TaskExtractionBatchEntity,
  type TaskExtractionEntity,
} from '@/domain/entities';

const NOT_FOUND_OR_FORBIDDEN = 'Recurso não encontrado ou sem permissão.';

const ensureClassOwnership = async (classId: string, userId: string): Promise<ClassEntity> => {
  const classItem = await ClassRepository.getById(classId);
  if (!classItem || classItem.userId !== userId) {
    throw new Error(NOT_FOUND_OR_FORBIDDEN);
  }
  return classItem;
};

export const assertClassOwnedByUser = ensureClassOwnership;

export const assertTaskOwnedByUser = async (
  taskId: string,
  userId: string,
): Promise<TaskEntity> => {
  const task = await TaskRepository.getById(taskId);
  if (!task) {
    throw new Error(NOT_FOUND_OR_FORBIDDEN);
  }

  await ensureClassOwnership(task.classId, userId);
  return task;
};

export const assertBatchOwnedByUser = async (
  batchId: string,
  userId: string,
): Promise<TaskExtractionBatchEntity> => {
  const batch = await TaskExtractionBatchRepository.getById(batchId);
  if (!batch) {
    throw new Error(NOT_FOUND_OR_FORBIDDEN);
  }

  await assertTaskOwnedByUser(batch.taskId, userId);
  return batch;
};

export const assertExtractionOwnedByUser = async (
  extractionId: string,
  userId: string,
): Promise<TaskExtractionEntity> => {
  const extraction = await TaskExtractionRepository.getById(extractionId);
  if (!extraction) {
    throw new Error(NOT_FOUND_OR_FORBIDDEN);
  }

  await assertTaskOwnedByUser(extraction.taskId, userId);
  return extraction;
};
