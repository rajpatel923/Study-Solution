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
  content_type?: string;
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
  id?: string;
  _id?: string; // Adding support for MongoDB style IDs
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
  count?: number;
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

const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL;

const api = axios.create({
  baseURL: `${API_BASE_URL}/aiservice/api/v1/flashcards`,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: 1500000,
});

const flashcardService = {

  createFlashcards: async (
    flashcardData: FlashcardCreate
  ): Promise<FlashcardResponse> => {
    try {
      const response: AxiosResponse<FlashcardResponse> = await api.post(
        "/",
        flashcardData,
        {
          headers: {
            "X-User-ID": flashcardData.user_id,
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

  getFlashcardsBySet: async (
    setId: string,
  ): Promise<FlashcardSetResponse> => {
    try {
      const response: AxiosResponse<FlashcardSetResponse> = await api.get(
        `/set/${setId}`
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
      const response: AxiosResponse<any> = await api.patch(
        `/${flashcardId}`,
        {
          ...updateData,
          user_id: userId,
        },
        {
          headers: {
            "X-User-ID": userId,
          },
        }
      );
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

  // Review flashcard
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
        },
        {
          headers: {
            "X-User-ID": userId,
          },
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
      const response: AxiosResponse<any> = await api.delete(`/${flashcardId}`, {
        headers: {
          "X-User-ID": userId,
        },
      });
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

  // Get all flashcards for a user with pagination and filters
  getAllFlashcards: async (
    userId: string,
    limit: number = 10,
    contentType?: string,
    tag?: string,
    difficulty?: string
  ): Promise<{ status: string; flashcards?: Flashcard[]; count?: number }> => {
    try {
      // Construct query parameters
      const params: any = { limit };

      if (contentType) params.content_type = contentType;
      if (tag) params.tag = tag;
      if (difficulty) params.difficulty = difficulty;

      const response: AxiosResponse<any> = await api.get("/", {
        params,
        headers: {
          "X-User-ID": userId,
        },
      });

      return response.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail || "Error fetching flashcards";
      toast.error(errorMessage);
      console.error("Error fetching flashcards:", error);
      throw error;
    }
  },

  // Get all flashcard sets for a user
  getAllFlashcardSets: async (
    userId: string
  ): Promise<{ status: string; flashcard_sets?: any[]; count?: number }> => {
    try {
      // Using the user-sets endpoint
      const response: AxiosResponse<any> = await api.get("/user-sets", {
        headers: {
          "X-User-ID": userId,
        },
      });

      return response.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail || "Error fetching flashcard sets";
      toast.error(errorMessage);
      console.error("Error fetching flashcard sets:", error);
      throw error;
    }
  },
};

export default flashcardService;
