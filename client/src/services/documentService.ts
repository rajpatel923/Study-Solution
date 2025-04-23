"use client";

import axios, { AxiosResponse } from "axios";
import { toast } from "sonner";

// Define types for API responses
interface DocumentDTO {
  id: number;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  uploadedAt: string;
  url: string;
  previewUrl: string;
  pageCount?: number;
  metadata?: string;
  active: boolean;
}

interface DocumentResponse {
  success: boolean;
  message: string;
  id?: number;
  fileName?: string;
  publicUrl?: string;
}
interface UrlUploadRequest {
  url: string;
  userId?: string;
  title?: string;
}

const extractTitleFromUrl = (url: string): string => {
  try {
    // Extract filename from URL
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;
    const filename = pathname.split("/").pop() || "";

    // Remove file extension and replace dashes/underscores with spaces
    return (
      filename.split(".").slice(0, -1).join(".").replace(/[-_]/g, " ").trim() ||
      "URL Document"
    );
  } catch (e) {
    return "URL Document";
  }
};

// Create an axios instance with default configs
const api = axios.create({
  baseURL: "http://localhost:8091/documentservice/api/v1/documents",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// API service for document operations
const documentService = {
  // Upload a document
  uploadDocument: async (file: File): Promise<DocumentResponse> => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response: AxiosResponse<DocumentResponse> = await api.post(
        "/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        toast.success("Document uploaded successfully");
      }

      return response.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || "Error uploading document";
      toast.error(errorMessage);
      console.error("Error uploading document:", error);
      throw error;
    }
  },

  // Get all documents
  getAllDocuments: async (): Promise<DocumentDTO[]> => {
    try {
      const response: AxiosResponse<DocumentDTO[]> = await api.get(
        "/user/with-preview"
      );
      console.log("Documents fetched successfully:", response.data);
      return response.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || "Error fetching documents";
      toast.error(errorMessage);
      console.error("Error fetching documents:", error);
      throw error;
    }
  },

  // Get document by ID
  getDocumentById: async (id: number): Promise<DocumentDTO> => {
    try {
      const response: AxiosResponse<DocumentDTO> = await api.get(`/${id}`);
      return response.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        `Error fetching document with ID ${id}`;
      toast.error(errorMessage);
      console.error(`Error fetching document with ID ${id}:`, error);
      throw error;
    }
  },

  // Download document
  downloadDocument: async (id: number): Promise<boolean> => {
    try {
      const response: AxiosResponse<Blob> = await api.get(`/download/${id}`, {
        responseType: "blob",
      });

      // Create a URL for the blob and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const contentDisposition = response.headers["content-disposition"];
      let filename = "document";

      if (contentDisposition) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(contentDisposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, "");
        }
      }

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Document downloaded successfully");
      return true;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || `Error downloading document`;
      toast.error(errorMessage);
      console.error(`Error downloading document with ID ${id}:`, error);
      throw error;
    }
  },

  // Delete document (soft delete)
  deleteDocument: async (id: number): Promise<boolean> => {
    try {
      await api.delete(`/${id}`);
      toast.success("Document deleted successfully");
      return true;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || `Error deleting document`;
      toast.error(errorMessage);
      console.error(`Error deleting document with ID ${id}:`, error);
      throw error;
    }
  },

  // Permanently delete document
  permanentlyDeleteDocument: async (id: number): Promise<boolean> => {
    try {
      await api.delete(`/${id}/permanent`);
      toast.success("Document permanently deleted");
      return true;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || `Error permanently deleting document`;
      toast.error(errorMessage);
      console.error(
        `Error permanently deleting document with ID ${id}:`,
        error
      );
      throw error;
    }
  },

  // Search documents by filename
  searchDocuments: async (fileName: string): Promise<DocumentDTO[]> => {
    try {
      const response: AxiosResponse<DocumentDTO[]> = await api.get("/search", {
        params: { fileName },
      });
      return response.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || `Error searching documents`;
      toast.error(errorMessage);
      console.error(
        `Error searching documents with filename ${fileName}:`,
        error
      );
      throw error;
    }
  },

  // Get recent documents
  getRecentDocuments: async (days: number = 7): Promise<DocumentDTO[]> => {
    try {
      const response: AxiosResponse<DocumentDTO[]> = await api.get("/recent", {
        params: { days },
      });
      return response.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || `Error fetching recent documents`;
      toast.error(errorMessage);
      console.error(`Error fetching recent documents:`, error);
      throw error;
    }
  },

  // Update document metadata
  updateDocumentMetadata: async (
    id: number,
    metadata: string
  ): Promise<DocumentDTO> => {
    try {
      const response: AxiosResponse<DocumentDTO> = await api.put(
        `/${id}/metadata`,
        metadata
      );
      toast.success("Document metadata updated successfully");
      return response.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || `Error updating metadata`;
      toast.error(errorMessage);
      console.error(
        `Error updating metadata for document with ID ${id}:`,
        error
      );
      throw error;
    }
  },

  // Update document page count
  updateDocumentPageCount: async (
    id: number,
    pageCount: number
  ): Promise<DocumentDTO> => {
    try {
      const response: AxiosResponse<DocumentDTO> = await api.put(
        `/${id}/page-count`,
        null,
        {
          params: { pageCount },
        }
      );
      toast.success("Document page count updated successfully");
      return response.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || `Error updating page count`;
      toast.error(errorMessage);
      console.error(
        `Error updating page count for document with ID ${id}:`,
        error
      );
      throw error;
    }
  },

  // Health check
  healthCheck: async (): Promise<string> => {
    try {
      const response: AxiosResponse<string> = await api.get("/health");
      return response.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || "API health check failed";
      toast.error(errorMessage);
      console.error("Error checking API health:", error);
      throw error;
    }
  },

  uploadFromUrl: async (url: string): Promise<DocumentResponse> => {
    try {
      const requestData: UrlUploadRequest = {
        url,
        userId: "user123", // Replace with actual user ID from auth context
        title: extractTitleFromUrl(url),
      };

      const response: AxiosResponse<DocumentResponse> = await api.post(
        "/upload-url",
        requestData,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        toast.success("URL document processed successfully");
      }

      return response.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || "Error processing URL";
      toast.error(errorMessage);
      console.error("Error processing URL:", error);
      throw error;
    }
  },
};

export type { DocumentDTO, DocumentResponse };
export default documentService;
