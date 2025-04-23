// src/types/document.ts
export interface Document {
  id: number;
  fileName: string;
  userName: string;
  userId: string;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  publicUrl: string;
  previewUrl: string;
  pageCount: number;
  fileExtension: string;
  metadata: string | null;
  uploadDateTime: string;
  lastAccessDateTime: string | null;
}

export interface DocumentMetadata {
  title?: string;
  outputType?: string;
  language?: string;
  noteLength?: string;
  structureFormat?: string;
  pageRange?: string;
  customPrompt?: string;
  isPublic?: boolean;
  allowPdfViewing?: boolean;
  customPageRange?: string;
  cardCount?: string;
  difficulty?: string;
  topicFocus?: string;
}

export type FileCategory = "All" | "PDF" | "Image" | "Video" | "Other";

export type SortOption = "name" | "date" | "size" | "type";

export type ViewMode = "grid" | "list";
