"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { SampleFlashcard, Flashcard } from "@/services/flashcardService";
import { DocumentResponse } from "@/services/documentService";

// Define the workflow states
export enum FlashcardWorkflowState {
  UPLOAD = "upload",
  FORM = "form",
  GENERATING = "generating",
  DISPLAY = "display",
  ERROR = "error"
}

// Define the context type
interface FlashcardContextType {
  // Workflow state
  workflowState: FlashcardWorkflowState;
  setWorkflowState: (state: FlashcardWorkflowState) => void;
  
  // Document upload data
  uploadedDocument: DocumentResponse | null;
  setUploadedDocument: (document: DocumentResponse | null) => void;
  
  // Flashcard generation parameters
  cardCount: number;
  setCardCount: (count: number) => void;
  difficultyLevel: string;
  setDifficultyLevel: (level: string) => void;
  customPrompt: string;
  setCustomPrompt: (prompt: string) => void;
  tags: string[];
  setTags: (tags: string[]) => void;
  focusAreas: string[];
  setFocusAreas: (areas: string[]) => void;
  
  // Generated flashcards data
  flashcardSetId: string | null;
  setFlashcardSetId: (id: string | null) => void;
  documentId: string | null;
  setDocumentId: (id: string | null) => void;
  sampleFlashcards: SampleFlashcard[];
  setSampleFlashcards: (cards: SampleFlashcard[]) => void;
  flashcards: Flashcard[];
  setFlashcards: (cards: Flashcard[]) => void;
  
  // Current flashcard display state
  currentFlashcardIndex: number;
  setCurrentFlashcardIndex: (index: number) => void;
  isFlipped: boolean;
  setIsFlipped: (flipped: boolean) => void;
  
  // Error handling
  error: string | null;
  setError: (error: string | null) => void;
  
  // Reset the context
  resetContext: () => void;
}

// Create the context
const FlashcardContext = createContext<FlashcardContextType | undefined>(undefined);

// Provider component
export function FlashcardProvider({ children }: { children: ReactNode }) {
  // Workflow state
  const [workflowState, setWorkflowState] = useState<FlashcardWorkflowState>(
    FlashcardWorkflowState.UPLOAD
  );
  
  // Document upload data
  const [uploadedDocument, setUploadedDocument] = useState<DocumentResponse | null>(null);
  
  // Flashcard generation parameters
  const [cardCount, setCardCount] = useState<number>(10);
  const [difficultyLevel, setDifficultyLevel] = useState<string>("mixed");
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  
  // Generated flashcards data
  const [flashcardSetId, setFlashcardSetId] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [sampleFlashcards, setSampleFlashcards] = useState<SampleFlashcard[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  
  // Current flashcard display state
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  
  // Error handling
  const [error, setError] = useState<string | null>(null);
  
  // Reset the context
  const resetContext = () => {
    setWorkflowState(FlashcardWorkflowState.UPLOAD);
    setUploadedDocument(null);
    setCardCount(10);
    setDifficultyLevel("mixed");
    setCustomPrompt("");
    setTags([]);
    setFocusAreas([]);
    setFlashcardSetId(null);
    setDocumentId(null);
    setSampleFlashcards([]);
    setFlashcards([]);
    setCurrentFlashcardIndex(0);
    setIsFlipped(false);
    setError(null);
  };
  
  return (
    <FlashcardContext.Provider
      value={{
        workflowState,
        setWorkflowState,
        uploadedDocument,
        setUploadedDocument,
        cardCount,
        setCardCount,
        difficultyLevel,
        setDifficultyLevel,
        customPrompt,
        setCustomPrompt,
        tags,
        setTags,
        focusAreas,
        setFocusAreas,
        flashcardSetId,
        setFlashcardSetId,
        documentId,
        setDocumentId,
        sampleFlashcards,
        setSampleFlashcards,
        flashcards,
        setFlashcards,
        currentFlashcardIndex,
        setCurrentFlashcardIndex,
        isFlipped,
        setIsFlipped,
        error,
        setError,
        resetContext,
      }}
    >
      {children}
    </FlashcardContext.Provider>
  );
}

// Custom hook to use the flashcard context
export function useFlashcardContext() {
  const context = useContext(FlashcardContext);
  if (context === undefined) {
    throw new Error("useFlashcardContext must be used within a FlashcardProvider");
  }
  return context;
}