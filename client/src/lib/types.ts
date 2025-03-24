export interface SummaryFormData {
  format: "bullet" | "paragraph" | "outline";
  length: "short" | "medium" | "long";
  customPrompt: string;
}

export interface SummaryMetadata {
  title?: string;
  pageCount?: number;
  wordCount?: number;
  readingTime?: number;
  [key: string]: any;
}

export interface UploadResponse {
  success: boolean;
  fileName?: string;
  error?: string;
}

export interface PdfSummaryRequest {
  fileName: string;
  format: string;
  length: string;
  customPrompt: string;
}

export interface PdfSummaryResponse {
  summary: string;
  metadata: SummaryMetadata;
}

export interface SaveSummaryRequest {
  fileName: string;
  summary: string;
  metadata: SummaryMetadata;
}
