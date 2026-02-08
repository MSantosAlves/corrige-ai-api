import { env } from '../../config/env.js';

export type OCRDocumentType = 'pdf_native' | 'printed' | 'handwritten' | 'auto';

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

export type OCRAsyncJobStatus =
  | 'PENDING'
  | 'STARTED'
  | 'SUCCESS'
  | 'FAILED'
  | 'PARTIAL_SUCCESS'
  | 'CANCELED';

export type OCRAsyncJobResponse = {
  job_id: string;
  status: OCRAsyncJobStatus;
};

export type OCRBulkAsyncResponse = {
  parent_job_id: string;
  status: OCRAsyncJobStatus;
  children?: Array<{
    id?: string | null;
    job_id: string;
    filename: string;
    status: OCRAsyncJobStatus;
    result?: OCRExtractResponse | null;
    error?: Record<string, unknown> | null;
    duration_ms?: number | null;
  }>;
  ignored_files?: Array<string> | null;
};

export type OCRJobStatusResponse = {
  id?: string | null;
  job_id: string;
  status: OCRAsyncJobStatus;
  job_type?: string;
  parent_job_id?: string | null;
  created_at?: string;
  updated_at?: string;
  duration_ms?: number;
  input_meta?: Record<string, unknown>;
  children_summary?: {
    total?: number;
    pending?: number;
    started?: number;
    success?: number;
    failed?: number;
  };
  children?: Array<{
    id?: string | null;
    job_id: string;
    filename?: string;
    status: OCRAsyncJobStatus;
    result?: OCRExtractResponse | null;
    error?: Record<string, unknown> | null;
    duration_ms?: number | null;
  }>;
  result?: OCRExtractResponse;
  error?: Record<string, unknown>;
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

    if (!this.apiKey) {
      throw new Error('OCR_API_KEY is required to call OCR service.');
    }
  }

  async extract(params: OCRExtractRequest): Promise<OCRExtractResponse> {
    const formData = new FormData();
    const contentType = this.getContentType(params.fileName);
    const fileData = this.toArrayBuffer(params.data);

    formData.append('file', new Blob([fileData], { type: contentType }), params.fileName);

    this.appendCommonParams(formData, params);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.buildUrl('/api/v1/ocr/extract'), {
        method: 'POST',
        headers: this.apiKey ? { 'X-API-Key': this.apiKey } : undefined,
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorPayload = (await this.safeJson<OCRErrorResponse>(response)) ?? {};
        const message =
          errorPayload.error?.message ?? `OCR request failed with status ${response.status}.`;
        throw new Error(message);
      }

      return (await response.json()) as OCRExtractResponse;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async extractAsync(params: OCRExtractRequest): Promise<OCRAsyncJobResponse> {
    const formData = new FormData();
    const contentType = this.getContentType(params.fileName);
    const fileData = this.toArrayBuffer(params.data);

    formData.append('file', new Blob([fileData], { type: contentType }), params.fileName);
    this.appendCommonParams(formData, params);

    return await this.postForm<OCRAsyncJobResponse>('/api/v1/ocr/extract-async', formData);
  }

  async extractAsyncBulk(
    files: Array<{ fileName: string; data: Buffer }>,
    params?: Omit<OCRExtractRequest, 'fileName' | 'data'>,
  ): Promise<OCRBulkAsyncResponse> {
    const formData = new FormData();

    files.forEach((file) => {
      const contentType = this.getContentType(file.fileName);
      const fileData = this.toArrayBuffer(file.data);
      formData.append('files', new Blob([fileData], { type: contentType }), file.fileName);
    });

    if (params) {
      this.appendCommonParams(formData, params);
    }

    return await this.postForm<OCRBulkAsyncResponse>('/api/v1/ocr/extract-async-bulk', formData);
  }

  async extractAsyncBulkZip(fileName: string, data: Buffer): Promise<OCRBulkAsyncResponse> {
    const formData = new FormData();
    const fileData = this.toArrayBuffer(data);
    formData.append('file', new Blob([fileData], { type: 'application/zip' }), fileName);

    return await this.postForm<OCRBulkAsyncResponse>(
      '/api/v1/ocr/extract-async-bulk-zip',
      formData,
    );
  }

  async getJobStatus(jobId: string): Promise<OCRJobStatusResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.buildUrl(`/api/v1/ocr/jobs/${jobId}`), {
        method: 'GET',
        headers: this.apiKey ? { 'X-API-Key': this.apiKey } : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorPayload = (await this.safeJson<OCRErrorResponse>(response)) ?? {};
        const message =
          errorPayload.error?.message ?? `OCR request failed with status ${response.status}.`;
        throw new Error(message);
      }

      return (await response.json()) as OCRJobStatusResponse;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private buildUrl(path: string): string {
    return `${this.baseUrl.replace(/\/$/, '')}${path}`;
  }

  private getContentType(fileName: string): string {
    const extension = fileName.toLowerCase().split('.').pop();
    if (extension === 'pdf') {
      return 'application/pdf';
    }
    if (extension === 'png') {
      return 'image/png';
    }
    if (extension === 'jpg' || extension === 'jpeg' || extension === 'jpepg') {
      return 'image/jpeg';
    }
    return 'application/octet-stream';
  }

  private toArrayBuffer(data: Buffer): ArrayBuffer {
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  }

  private async safeJson<T>(response: Response): Promise<T | null> {
    try {
      return (await response.json()) as T;
    } catch {
      return null;
    }
  }

  private appendCommonParams(formData: FormData, params: Partial<OCRExtractRequest>): void {
    if (params.documentType) {
      formData.append('document_type', params.documentType);
    }
    if (params.language) {
      formData.append('language', params.language);
    }
    if (typeof params.preserveLayout === 'boolean') {
      formData.append('preserve_layout', String(params.preserveLayout));
    }
    if (typeof params.qualityThreshold === 'number') {
      formData.append('quality_threshold', String(params.qualityThreshold));
    }
  }

  private async postForm<T>(path: string, formData: FormData): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.buildUrl(path), {
        method: 'POST',
        headers: this.apiKey ? { 'X-API-Key': this.apiKey } : undefined,
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorPayload = (await this.safeJson<OCRErrorResponse>(response)) ?? {};
        const message =
          errorPayload.error?.message ?? `OCR request failed with status ${response.status}.`;
        throw new Error(message);
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
