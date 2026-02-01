import type { Request } from "express";
import { z } from "zod";

import { OCRClient, OCRDocumentType } from "../../ocr/OcrClient";
import { saveTaskExtractionUseCase } from "../../usecases/extractions";
import { LlmClient } from "../../llm/LlmClient";

const ocrClientInstance = new OCRClient();
const llmClientInstance = new LlmClient();

const extractBodySchema = z.object({
  user_id: z.string().uuid().optional(),
  class_id: z.string().uuid().optional(),
  task_id: z.string().uuid().optional(),
  document_type: z.enum(["pdf_native", "printed", "handwritten", "auto"]).optional(),
  language: z.string().optional(),
  preserve_layout: z.boolean().optional(),
  quality_threshold: z.number().min(0).max(1).optional()
});

const extractFileSchema = z.object({
  originalname: z.string().min(1),
  buffer: z.instanceof(Buffer)
});

export const extractTextUseCase = async (req: Request) => {
  const body = extractBodySchema.parse(req.body ?? {});
  const file = extractFileSchema.parse(req.file);

  const {
    user_id: userId,
    class_id: classId,
    task_id: taskId,
    document_type: documentType,
    language,
    preserve_layout: preserveLayout,
    quality_threshold: qualityThreshold
  } = body;

  const ocrResponse = await ocrClientInstance.extract({
    fileName: file.originalname,
    data: file.buffer,
    documentType: documentType as OCRDocumentType,
    language,
    preserveLayout,
    qualityThreshold
  });

  const analysis =
    ocrResponse.text && ocrResponse.text.trim().length > 0
      ? await llmClientInstance.analyzeText(
          ocrResponse.text,
          documentType ?? ocrResponse.document_type
        )
      : "";

  if (taskId) {
    try {
      await saveTaskExtractionUseCase({
        taskId,
        ocrExtractionResult: ocrResponse,
        analysisResult:
          typeof analysis === "string" ? analysis : JSON.stringify(analysis),
        filename: file.originalname
      });
    } catch (error) {
      console.error("Erro ao salvar extração no banco:", error);
    }
  }

  return {
    ...ocrResponse,
    analysis
  };
};
