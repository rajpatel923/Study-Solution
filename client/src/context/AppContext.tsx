"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback } from "react";
import summaryService from "@/services/summaryService"; // Adjust the import path as needed

interface File {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: Date;
  publicUrl: string;
}

interface SummaryResult {
  id: string;
  fileId: string;
  title: string;
  summary: string;
  keyPoints: string[];
  flashcards: { question: string; answer: string }[];
  createdAt: Date;
}

interface DocumentMetadata {
  documentId: string;
  summaryId: string;
  wordCount: number;
  createdAt: string;
  lastUpdated: string;
  title?: string;
  tags?: string[];
}

interface SaveStatus {
  status: "idle" | "saving" | "saved" | "error";
  lastSaved: Date | null;
  error?: string;
}

interface AppContextType {
  files: File[];
  results: SummaryResult[];
  currentFile: File | null;
  currentResult: SummaryResult | null;
  isProcessing: boolean;
  addFile: (file: File) => void;
  removeFile: (fileId: string) => void;
  addResult: (result: SummaryResult) => void;
  setCurrentFile: (file: File | null) => void;
  setCurrentResult: (result: SummaryResult | null) => void;
  setIsProcessing: (isProcessing: boolean) => void;
  editorContent: string;
  setEditorContent: (content: string) => void;
  documentMetadata: DocumentMetadata | null;
  setDocumentMetadata: (metadata: DocumentMetadata | null) => void;
  updateDocumentMetadata: (updates: Partial<DocumentMetadata>) => void;
  saveDocument: (content: string) => Promise<void>;
  saveStatus: SaveStatus;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<SummaryResult[]>([]);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [currentResult, setCurrentResult] = useState<SummaryResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [editorContent, setEditorContent] = useState<string>('');
  const [documentMetadata, setDocumentMetadata] = useState<DocumentMetadata | null>(null);
  
  // Add save status state
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({
    status: "idle",
    lastSaved: null
  });

  const addFile = (file: File) => {
    setFiles((prevFiles) => [...prevFiles, file]);
  };

  const removeFile = (fileId: string) => {
    setFiles((prevFiles) => prevFiles.filter((file) => file.id !== fileId));
    setResults((prevResults) => prevResults.filter((result) => result.fileId !== fileId));
  };

  const addResult = (result: SummaryResult) => {
    setResults((prevResults) => [...prevResults, result]);
  };

  const updateDocumentMetadata = (updates: Partial<DocumentMetadata>) => {
    setDocumentMetadata(prev => {
      if (!prev) return null;
      return { ...prev, ...updates, lastUpdated: new Date().toISOString() };
    });
  };

  // Implement the save document function
  const saveDocument = useCallback(async (content: string) => {
    if (!documentMetadata?.summaryId) {
      setSaveStatus({
        status: "error",
        lastSaved: null,
        error: "No summary ID found to save"
      });
      return;
    }

    try {
      setSaveStatus({
        ...saveStatus,
        status: "saving"
      });

      // Use your summaryService to update the summary with the new content
      await summaryService.updateSummary(documentMetadata.summaryId, {
        summary_content: content,
        user_id: "current-user-id" // This should be replaced with actual user authentication
      });

      // Update save status on success
      setSaveStatus({
        status: "saved",
        lastSaved: new Date()
      });

      // After 3 seconds, set status back to idle
      setTimeout(() => {
        setSaveStatus(prev => ({
          ...prev,
          status: "idle"
        }));
      }, 3000);

    } catch (error) {
      console.error("Error saving document:", error);
      setSaveStatus({
        status: "error",
        lastSaved: saveStatus.lastSaved,
        error: "Failed to save document"
      });
      
      // After 3 seconds, set status back to idle
      setTimeout(() => {
        setSaveStatus(prev => ({
          ...prev,
          status: "idle"
        }));
      }, 3000);
    }
  }, [documentMetadata, saveStatus]);

  return (
    <AppContext.Provider
      value={{
        files,
        results,
        currentFile,
        currentResult,
        isProcessing,
        addFile,
        removeFile,
        addResult,
        setCurrentFile,
        setCurrentResult,
        setIsProcessing,
        editorContent,
        setEditorContent,
        documentMetadata,
        setDocumentMetadata,
        updateDocumentMetadata,
        saveDocument,
        saveStatus
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}