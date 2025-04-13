"use client";

import axios, { AxiosResponse } from "axios";
import { toast } from "sonner";

// Define types for API requests and responses
export interface FlashcardCreate {
  content_url: string;
  user_id?: string;
  tags?: string[];
  difficulty_level?: string;
  focus_areas?: string[];
  card_count?: number;
}

export interface SampleFlashcard {
  front: string;
  back: string;
}

export interface FlashcardResponse {
  status: "success" | "error";
  flashcard_set_id?: string;
  document_id?: string;
  flashcard_count?: number;
  sample_flashcards?: SampleFlashcard[];
  error_message?: string;
  content_type?: string;
}

export interface Flashcard {
  id: string;
  user_id: string;
  document_id: string;
  flashcard_set_id: string;
  front_text: string;
  back_text: string;
  difficulty: string;
  category: string;
  tags: string[];
  created_at: string;
  review_count: number;
  confidence_level: number;
  last_reviewed?: string;
  metadata: Record<string, any>;
  content_type: string;
}

export interface FlashcardSetResponse {
  status: string;
  message?: string;
  flashcards?: Flashcard[];
  flashcard_set?: {
    id: string;
    user_id: string;
    document_id: string;
    title: string;
    description?: string;
    flashcard_count: number;
    created_at: string;
    tags: string[];
    content_type: string;
  };
}

// Use environment variable with fallback
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// Create an axios instance with default configs
const api = axios.create({
  baseURL: `${API_BASE_URL}/flashcards`,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: 1500000, // 15 seconds timeout
});

// API service for flashcard operations
const flashcardService = {
  // Create flashcards from content
  createFlashcards: async (
    flashcardData: FlashcardCreate
  ): Promise<FlashcardResponse> => {
    try {
      const response: AxiosResponse<FlashcardResponse> = await api.post(
        "/",
        flashcardData,
        {
          headers: {
            "X-User-ID": flashcardData.user_id || "user123",
          },
        }
      );

      if (response.data.status === "success") {
        toast.success("Flashcards generated successfully");
      }

      return response.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail || "Error creating flashcards";
      toast.error(errorMessage);
      console.error("Error creating flashcards:", error);
      throw error;
    }
  },

  // Get flashcards by set ID
  getFlashcardsBySet: async (
    setId: string,
    userId: string
  ): Promise<FlashcardSetResponse> => {
    try {
      const response: AxiosResponse<FlashcardSetResponse> = await api.get(
        `/set/${setId}`,
        {
          headers: {
            "X-User-ID": userId,
          },
        }
      );
      return response.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail ||
        `Error fetching flashcards for set ${setId}`;
      toast.error(errorMessage);
      console.error(`Error fetching flashcards for set ${setId}:`, error);
      throw error;
    }
  },

  // Get a single flashcard by ID
  getFlashcardById: async (
    flashcardId: string,
    userId: string
  ): Promise<any> => {
    try {
      const response: AxiosResponse<any> = await api.get(`/${flashcardId}`, {
        headers: {
          "X-User-ID": userId,
        },
      });
      return response.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail ||
        `Error fetching flashcard with ID ${flashcardId}`;
      toast.error(errorMessage);
      console.error(`Error fetching flashcard with ID ${flashcardId}:`, error);
      throw error;
    }
  },

  // Update a flashcard
  updateFlashcard: async (
    flashcardId: string,
    updateData: any,
    userId: string
  ): Promise<any> => {
    try {
      const response: AxiosResponse<any> = await api.patch(`/${flashcardId}`, {
        ...updateData,
        user_id: userId,
      });
      toast.success("Flashcard updated successfully");
      return response.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail || "Error updating flashcard";
      toast.error(errorMessage);
      console.error(`Error updating flashcard with ID ${flashcardId}:`, error);
      throw error;
    }
  },

  // Update flashcard review status
  reviewFlashcard: async (
    flashcardId: string,
    confidenceLevel: number,
    userId: string
  ): Promise<any> => {
    try {
      const response: AxiosResponse<any> = await api.post(
        `/${flashcardId}/review`,
        {
          confidence_level: confidenceLevel,
          user_id: userId,
        }
      );
      return response.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail || "Error updating flashcard review";
      toast.error(errorMessage);
      console.error(`Error reviewing flashcard with ID ${flashcardId}:`, error);
      throw error;
    }
  },

  // Delete a flashcard
  deleteFlashcard: async (
    flashcardId: string,
    userId: string
  ): Promise<any> => {
    try {
      const response: AxiosResponse<any> = await api.delete(
        `/${flashcardId}?user_id=${userId}`
      );
      toast.success("Flashcard deleted successfully");
      return response.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail || "Error deleting flashcard";
      toast.error(errorMessage);
      console.error(`Error deleting flashcard with ID ${flashcardId}:`, error);
      throw error;
    }
  },
};

export default flashcardService;
