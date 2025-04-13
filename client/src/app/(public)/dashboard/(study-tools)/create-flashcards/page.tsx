"use client";

import React from "react";
import { FlashcardProvider, useFlashcardContext, FlashcardWorkflowState } from "@/context/FlashcardContext";
import UploadForm from "@/components/study-tools/summarizer/UploadForm";
import FlashcardCreationForm from "@/components/study-tools/flashcards/FlashcardCreationForm";
import FlashcardDisplay from "@/components/study-tools/flashcards/FlashCardDisplay";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import AnimatedBackground from "@/components/study-tools/summarizer/AnimatedBackground";
import LoadingState from "@/components/study-tools/flashcards/LoadingState";
import { toast } from "sonner";
import documentService from "@/services/documentService";
import "@/app/(public)/dashboard/(study-tools)/create-flashcards/flashcard-styles.css";

// Main content component that uses the context
function FlashcardContent() {
  const { 
    workflowState, 
    setWorkflowState, 
    setUploadedDocument, 
    error, 
    resetContext 
  } = useFlashcardContext();

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    try {
      // Call actual document service
      const response = await documentService.uploadDocument(file);
      
      if (response.success) {
        setUploadedDocument({
          id: response.id || 0,
          fileName: response.fileName || file.name,
          publicUrl: response.publicUrl || "",
          message: "Document uploaded successfully",
          success: true
        });
        setWorkflowState(FlashcardWorkflowState.FORM);
        toast.success("Document uploaded successfully");
      } else {
        throw new Error(response.message || "Upload failed");
      }
    } catch (error: any) {
      console.error("Error uploading document:", error);
      toast.error(error.message || "Failed to upload document");
      resetContext();
    }
  };

  // Handle URL upload
  const handleUrlUpload = async (url: string) => {
    try {
      // Call actual document service
      const response = await documentService.uploadFromUrl(url);
      
      if (response.success) {
        setUploadedDocument({
          id: response.id || 0,
          fileName: response.fileName || "URL Document",
          publicUrl: response.publicUrl || url,
          message: "Document uploaded successfully", 
          success: true
        });
        setWorkflowState(FlashcardWorkflowState.FORM);
        toast.success("URL processed successfully");
      } else {
        throw new Error(response.message || "Processing URL failed");
      }
    } catch (error: any) {
      console.error("Error processing URL:", error);
      toast.error(error.message || "Failed to process URL");
      resetContext();
    }
  };

  // Render different components based on the workflow state
  const renderContent = () => {
    switch (workflowState) {
      case FlashcardWorkflowState.UPLOAD:
        return (
          <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6 text-center">Create Flashcards</h1>
            <p className="text-muted-foreground mb-8 text-center">
              Upload a document or enter a URL to generate flashcards automatically.
            </p>
            <UploadForm
              activeTab="pdf"
              onFileUpload={handleFileUpload}
              onUrlUpload={handleUrlUpload}
              fileTypes={["application/pdf", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "image/jpeg", "image/png"]}
              acceptedFileExtensions=".pdf,.ppt,.pptx,.jpg,.jpeg,.png"
              dropzoneText="Upload PDF, PowerPoint, or Image"
            />
          </div>
        );
        
      case FlashcardWorkflowState.FORM:
        return <FlashcardCreationForm />;
        
      case FlashcardWorkflowState.GENERATING:
        return (
          <LoadingState
            message="Generating Flashcards"
            subMessage="Our AI is analyzing your document and creating personalized flashcards for you. This might take a minute or two depending on the document size."
            progress={50}
          />
        );
        
      case FlashcardWorkflowState.DISPLAY:
        return <FlashcardDisplay />;
        
      case FlashcardWorkflowState.ERROR:
        return (
          <div className="max-w-2xl mx-auto">
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {error || "An error occurred during the flashcard creation process."}
              </AlertDescription>
            </Alert>
            <div className="text-center">
              <Button onClick={resetContext}>Try Again</Button>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 relative">
      <AnimatedBackground />
      <div className="relative z-10">
        {renderContent()}
      </div>
    </div>
  );
}

// Page component wrapped with provider
export default function FlashcardsPage() {
  return (
    <FlashcardProvider>
      <FlashcardContent />
    </FlashcardProvider>
  );
}