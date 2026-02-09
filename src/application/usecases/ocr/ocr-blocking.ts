import type { OCRErrorResponse } from '@/infra/providers/ocr/ocr-client';

export const INVALID_CONTENT_PT_BR =
  'Conteúdo inválido para extração. Tente enviar outros arquivos relacionados ao contexto educacional.';
export const MALICIOUS_CONTENT_PT_BR =
  'Conteúdo bloqueado por segurança. O envio foi marcado como malicioso.';

export type OcrBlockingInfo = {
  blockedByOcr: boolean;
  blockedCategory: string | null;
  blockedReason: string | null;
  isMalicious: boolean;
};

const parseErrorRecord = (error: unknown): Record<string, unknown> => {
  if (!error || typeof error !== 'object') {
    return {};
  }
  return error as Record<string, unknown>;
};

const getString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const getOcrBlockingInfo = (error: unknown): OcrBlockingInfo => {
  const parsed = parseErrorRecord(error);
  const code = getString(parsed.code);
  const message = getString(parsed.message);
  const details =
    parsed.details && typeof parsed.details === 'object'
      ? (parsed.details as Record<string, unknown>)
      : {};
  const blockedCategory = getString(details.blocked_category);
  const classifierReasoning = getString(details.classifier_reasoning);
  const blockedByClassifier =
    code === 'DOCUMENT_REJECTED_BY_CLASSIFIER' || blockedCategory !== null;
  const blockedReason = classifierReasoning ?? message;
  return {
    blockedByOcr: blockedByClassifier,
    blockedCategory,
    blockedReason,
    isMalicious: blockedCategory === 'malicious_content',
  };
};

export const getOcrBlockingInfoFromErrorPayload = (
  payload: OCRErrorResponse | null | undefined,
): OcrBlockingInfo => {
  return getOcrBlockingInfo(payload?.error ?? null);
};

export const buildBlockedExtractionResult = (data: {
  blockingInfo: OcrBlockingInfo;
  rawError: unknown;
}): Record<string, unknown> => {
  return {
    blocked_by_ocr: true,
    blocked_category: data.blockingInfo.blockedCategory,
    blocking_reason: data.blockingInfo.blockedReason,
    text: data.blockingInfo.isMalicious ? MALICIOUS_CONTENT_PT_BR : INVALID_CONTENT_PT_BR,
    error: data.rawError,
  };
};
