// src/lib/utils.ts
import { NextRequest } from "next/server";
import { Document, FileCategory } from "@/lib/documents";
import formidable from "formidable";

// Format file size to human-readable format
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Get file icon based on file extension
export const getFileIcon = (document: Document): string => {
  const extension = document.fileExtension.toLowerCase();

  switch (extension) {
    case "pdf":
      return "pdf";
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "svg":
      return "image";
    case "doc":
    case "docx":
      return "doc";
    case "xls":
    case "xlsx":
      return "xls";
    case "ppt":
    case "pptx":
      return "ppt";
    case "mp4":
    case "mov":
    case "avi":
      return "video";
    default:
      return "file";
  }
};

// Format date to human-readable format
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

// Parse JSON metadata
export const parseMetadata = (metadataString: string | null) => {
  if (!metadataString) return null;

  try {
    return JSON.parse(metadataString);
  } catch (e) {
    console.error("Failed to parse metadata:", e);
    return null;
  }
};

// Get document category based on content type
export const getDocumentCategory = (document: Document): string => {
  const contentType = document.contentType.toLowerCase();

  if (contentType.includes("pdf")) return "PDF";
  if (contentType.includes("image")) return "Image";
  if (contentType.includes("video")) return "Video";
  if (contentType.includes("audio")) return "Audio";
  if (contentType.includes("excel") || contentType.includes("spreadsheet"))
    return "Spreadsheet";
  if (contentType.includes("word") || contentType.includes("document"))
    return "Document";
  if (contentType.includes("presentation")) return "Presentation";

  return "Other";
};

// Filter documents by category
export const filterDocumentsByCategory = (
  documents: Document[],
  category: FileCategory
): Document[] => {
  if (category === "All") return documents;

  return documents.filter((doc) => getDocumentCategory(doc) === category);
};

// Sort documents by different criteria
export const sortDocuments = (
  documents: Document[],
  sortBy: string,
  order: "asc" | "desc" = "asc"
): Document[] => {
  const sorted = [...documents];

  switch (sortBy) {
    case "name":
      sorted.sort((a, b) =>
        a.originalFileName.localeCompare(b.originalFileName)
      );
      break;
    case "date":
      sorted.sort(
        (a, b) =>
          new Date(a.uploadDateTime).getTime() -
          new Date(b.uploadDateTime).getTime()
      );
      break;
    case "size":
      sorted.sort((a, b) => a.fileSize - b.fileSize);
      break;
    case "type":
      sorted.sort((a, b) => a.contentType.localeCompare(b.contentType));
      break;
    default:
      return sorted;
  }

  return order === "desc" ? sorted.reverse() : sorted;
};

// Search documents by name or metadata
export const searchDocuments = (
  documents: Document[],
  query: string
): Document[] => {
  if (!query) return documents;

  const lowerQuery = query.toLowerCase();

  return documents.filter((doc) => {
    const filename = doc.originalFileName.toLowerCase();
    const metadata = parseMetadata(doc.metadata);
    const metadataValues = metadata
      ? Object.values(metadata)
          .filter((value) => typeof value === "string")
          .join(" ")
          .toLowerCase()
      : "";

    return filename.includes(lowerQuery) || metadataValues.includes(lowerQuery);
  });
};

// Helper function to parse form data with files for API routes
export const parseForm = async (
  req: NextRequest
): Promise<{ fields: formidable.Fields; files: formidable.Files }> => {
  return new Promise((resolve, reject) => {
    // In a real application, this would use a proper file upload handler
    // For demo purposes, we're simulating the file upload
    const mockFile = {
      size: 1024 * 1024 * 2, // 2MB
      filepath: "/tmp/mock-file",
      originalFilename: "document.pdf",
      mimetype: "application/pdf",
    };

    // Extract fields from the request
    req
      .formData()
      .then((formData) => {
        const fields: formidable.Fields = {};
        const files: formidable.Files = { file: mockFile };

        // Convert FormData to fields
        for (const [key, value] of formData.entries()) {
          if (typeof value === "string") {
            fields[key] = value;
          }
        }

        resolve({ fields, files });
      })
      .catch(reject);
  });
};
