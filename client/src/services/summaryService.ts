"use client";

import axios, { AxiosResponse } from "axios";
import { toast } from "sonner";

// Define types for API requests and responses
export interface SummaryCreate {
  content_url: string;
  user_id?: string;
  prompt?: string;
  summary_length?: "short" | "medium" | "long";
  tags?: string[];
}

export interface SummaryResponse {
  status: "success" | "error" | "processing";
  summary_id: string;
  document_id?: string;
  summary?: string;
  word_count?: number;
  error_message?: string;
  message?: string;
}

export interface SummaryUpdate {
  summary_content?: string;
  title?: string;
  tags?: string[];
  user_id: string;
}


// Create an axios instance with default configs
const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_BACKEND_URL}/aiservice/api/v1/summaries`,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: 1500000,
});

// API service for summary operations
const summaryService = {
  // Create a new summary
  createSummary: async (
    summaryData: SummaryCreate,
    username : string | undefined,
  ): Promise<SummaryResponse> => {
    try {
      const response: AxiosResponse<SummaryResponse> = await api.post(
        "/",
        summaryData,
        {
          headers: {
            "X-User-ID": username? username : "",
          },
        }
      );

      if (response.data.status === "processing") {
        toast.success("Summary generation started");
      }

      return response.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail || "Error creating summary";
      toast.error(errorMessage);
      console.error("Error creating summary:", error);
      throw error;
    }
  },

  // Get a summary by ID
  getSummary: async (summaryId: string): Promise<SummaryResponse> => {
    try {
      // Get the user ID - in a real app, this would come from authentication
      // For now, using a placeholder user ID
      const userId = "current-user-id"; // Replace with actual user ID when available

      const response: AxiosResponse<SummaryResponse> = await api.get(
        `/${summaryId}?x_user_id=${userId}`
      );
      return response.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail ||
        `Error fetching summary with ID ${summaryId}`;
      toast.error(errorMessage);
      console.error(`Error fetching summary with ID ${summaryId}:`, error);
      throw error;
    }
  },

  // Legacy method for backwards compatibility
  getSummaryById: async (
    summaryId: string,
    userId: string | undefined
  ): Promise<SummaryResponse> => {
    try {
      const response: AxiosResponse<SummaryResponse> = await api.get(
        `/${summaryId}`
      );
      return response.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail ||
        `Error fetching summary with ID ${summaryId}`;
      toast.error(errorMessage);
      console.error(`Error fetching summary with ID ${summaryId}:`, error);
      throw error;
    }
  },

  // Get all summaries for a user
  getUserSummaries: async (
    userId: string,
    limit: number = 10
  ): Promise<SummaryResponse> => {
    try {
      const response: AxiosResponse<SummaryResponse> = await api.get(
        `/?user_id=${userId}&limit=${limit}`,
        {
          headers: {
            "X-User-ID": userId,
          },
        }
      );
      console.log("User summaries response:", response.data);
      return response.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail || "Error fetching summaries";
      toast.error(errorMessage);
      console.error("Error fetching summaries:", error);
      throw error;
    }
  },

  // Update a summary - enhanced for auto-save functionality
  updateSummary: async (
    summaryId: string,
    updateData: SummaryUpdate
  ): Promise<SummaryResponse> => {
    try {

      // Ensure user_id is included
      const finalUpdateData = {
        ...updateData,
        user_id: updateData.user_id,
      };
      const showToast = !updateData.summary_content;

      const response: AxiosResponse<SummaryResponse> = await api.patch(
        `/${summaryId}`,
        finalUpdateData
      );

      if (showToast) {
        toast.success("Summary updated successfully");
      }

      return response.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail || "Error updating summary";
      toast.error(errorMessage);
      console.error(`Error updating summary with ID ${summaryId}:`, error);
      throw error;
    }
  },

  // Delete a summary
  deleteSummary: async (
    summaryId: string,
    userId?: string
  ): Promise<SummaryResponse> => {
    try {
      // If userId is not provided, use the default
      const finalUserId = userId || "current-user-id";
      const url = `/${summaryId}?user_id=${finalUserId}`;

      const response: AxiosResponse<SummaryResponse> = await api.delete(url);
      toast.success("Summary deleted successfully");
      return response.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail || "Error deleting summary";
      toast.error(errorMessage);
      console.error(`Error deleting summary with ID ${summaryId}:`, error);
      throw error;
    }
  },

  // Poll for summary status when processing
  pollSummaryStatus: async (
    summaryId: string,
    interval = 3000,
    maxAttempts = 20
  ): Promise<SummaryResponse> => {
    return new Promise((resolve, reject) => {
      let attempts = 0;

      const checkStatus = async () => {
        try {
          const summary = await summaryService.getSummary(summaryId);

          if (summary.status === "success") {
            resolve(summary);
            return;
          }

          if (summary.status === "error") {
            reject(
              new Error(summary.error_message || "Summary processing failed")
            );
            return;
          }

          attempts++;
          if (attempts >= maxAttempts) {
            reject(new Error("Summary processing timed out"));
            return;
          }

          setTimeout(checkStatus, interval);
        } catch (error) {
          reject(error);
        }
      };

      checkStatus();
    });
  },
};

export default summaryService;
