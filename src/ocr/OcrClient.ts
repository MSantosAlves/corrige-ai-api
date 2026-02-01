import { env } from "../config/env";

export type OCRDocumentType =
  | "pdf_native"
  | "printed"
  | "handwritten"
  | "auto";

type OCRClientConfig = {
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
};

type OCRExtractRequest = {
  fileName: string;
  data: Buffer;
  documentType?: OCRDocumentType;
  language?: string;
  preserveLayout?: boolean;
  qualityThreshold?: number;
};

type OCRExtractResponse = {
  text: string;
  confidence: number;
  document_type: string;
  processor_used: string;
  processing_time_ms: number;
  metadata?: {
    page_count?: number;
    language_detected?: string;
    layout_preserved?: boolean;
    [key: string]: unknown;
  };
};

type OCRErrorResponse = {
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
    suggestion?: string;
  };
};

export class OCRClient {
  private baseUrl: string;
  private apiKey?: string;
  private timeoutMs: number;

  constructor(config: OCRClientConfig = {}) {
    this.baseUrl = config.baseUrl ?? env.OCR_BASE_URL;
    this.apiKey = config.apiKey ?? env.OCR_API_KEY;
    this.timeoutMs = config.timeoutMs ?? 60_000;
  }

  async extract(params: OCRExtractRequest): Promise<OCRExtractResponse> {
    const formData = new FormData();
    const contentType = this.getContentType(params.fileName);
    const fileData = this.toArrayBuffer(params.data);

    formData.append(
      "file",
      new Blob([fileData], { type: contentType }),
      params.fileName
    );

    if (params.documentType) {
      formData.append("document_type", params.documentType);
    }
    if (params.language) {
      formData.append("language", params.language);
    }
    if (typeof params.preserveLayout === "boolean") {
      formData.append("preserve_layout", String(params.preserveLayout));
    }
    if (typeof params.qualityThreshold === "number") {
      formData.append("quality_threshold", String(params.qualityThreshold));
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.buildUrl("/api/v1/ocr/extract"), {
        method: "POST",
        headers: this.apiKey ? { "X-API-Key": this.apiKey } : undefined,
        body: formData,
        signal: controller.signal
      });

      if (!response.ok) {
        const errorPayload =
          (await this.safeJson<OCRErrorResponse>(response)) ?? {};
        const message =
          errorPayload.error?.message ??
          `OCR request failed with status ${response.status}.`;
        throw new Error(message);
      }

      return (await response.json()) as OCRExtractResponse;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private buildUrl(path: string): string {
    return `${this.baseUrl.replace(/\/$/, "")}${path}`;
  }

  private getContentType(fileName: string): string {
    const extension = fileName.toLowerCase().split(".").pop();
    if (extension === "pdf") {
      return "application/pdf";
    }
    if (extension === "png") {
      return "image/png";
    }
    if (extension === "jpg" || extension === "jpeg" || extension === "jpepg") {
      return "image/jpeg";
    }
    return "application/octet-stream";
  }

  private toArrayBuffer(data: Buffer): ArrayBuffer {
    return data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength
    ) as ArrayBuffer;
  }

  private async safeJson<T>(response: Response): Promise<T | null> {
    try {
      return (await response.json()) as T;
    } catch {
      return null;
    }
  }
}
