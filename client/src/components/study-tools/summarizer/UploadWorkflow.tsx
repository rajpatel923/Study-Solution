"use client";

import React, { useState, useRef, useEffect } from "react";
import { gsap } from "gsap";
import { useAppContext } from "@/context/AppContext";
import UploadForm from "./UploadForm";
import SummaryPreferencesForm, { SummaryPreferences } from "./SummaryPreferenceForm";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import documentService, { DocumentDTO } from "@/services/documentService";
import summaryService, { SummaryCreate } from "@/services/summaryService";
import { useRouter } from "next/navigation";

enum WorkflowState {
  UPLOAD,
  UPLOADING,
  PREFERENCES,
  PROCESSING,
  COMPLETE,
  ERROR
}

interface UploadedFile {
  id: number;
  name: string;
  size: number;
  type: string;
  url: string;
  pages: number;
}

export default function UploadWorkflow() {
  const { addFile } = useAppContext();
  const [workflowState, setWorkflowState] = useState<WorkflowState>(WorkflowState.UPLOAD);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [summaryId, setSummaryId] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Initial animation when component mounts
  useEffect(() => {
    if (containerRef.current) {
      gsap.from(containerRef.current, {
        opacity: 0,
        y: 20,
        duration: 0.5,
        ease: "power2.out"
      });
    }
  }, []);

  // Content transition animation on state change
  useEffect(() => {
    if (contentRef.current) {
      // First set to initial state (opacity 1) to avoid any persistence of previous animations
      gsap.set(contentRef.current, { opacity: 1, y: 0 });
      
      // Then animate with a fresh tween
      gsap.from(contentRef.current, {
        opacity: 0,
        y: 10,
        duration: 0.4,
        ease: "power2.out",
        clearProps: "all" // This ensures no inline styles are left after animation
      });
    }
  }, [workflowState]);

  // Start processing progress animation
  useEffect(() => {
    if (workflowState === WorkflowState.PROCESSING) {
      // Setup a timer to simulate progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += 1;
        if (progress <= 95) {
          setProcessingProgress(progress);
        } else {
          clearInterval(interval);
        }
      }, 500);
      
      return () => clearInterval(interval);
    }
  }, [workflowState]);

  // Function to handle file upload
  const handleFileUpload = async (file: File) => {
    setWorkflowState(WorkflowState.UPLOADING);
    
    try {
      // Set up a timer to simulate gradual progress
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 5;
        if (progress <= 90) { // Only go up to 90% for visual feedback
          setUploadProgress(progress);
        }
      }, 100);
      
      // Actual upload to server
      const response = await documentService.uploadDocument(file);
      
      // Clear the interval once we have the response
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      if (response && response.success) {
        setUploadedFile({
          id: response.id || 0,
          name: response.fileName || "Untitled",
          size: file.size,
          type: file.type,
          url: response.publicUrl || "",
          pages: response.pageCount || 0
        });
        
        setTimeout(() => {
          setWorkflowState(WorkflowState.PREFERENCES);
        }, 500); // Short delay for visual feedback
      } else {
        throw new Error(response.message || "Upload failed");
      }
    } catch (error: any) {
      console.error("Error uploading file:", error);
      setErrorMessage(error.message || "Unknown error during upload");
      setWorkflowState(WorkflowState.ERROR);
    }
  };

  // Function to handle URL upload
  const handleUrlUpload = async (url: string) => {
    setWorkflowState(WorkflowState.UPLOADING);
    
    try {
      // For URL uploads, you would normally send the URL to your backend
      // This is a simplified version - you'll need to implement this in your backend
      const response = await documentService.uploadFromUrl(url);
      
      if (response && response.success) {
        setUploadedFile({
          id: response.id || 0,
          name: response.fileName || "URL Document",
          size: 0,
          type: "application/pdf", // Assuming PDF
          url: response.publicUrl || "",
          pages: response.pageCount || 0
        });
        
        setTimeout(() => {
          setWorkflowState(WorkflowState.PREFERENCES);
        }, 500);
      } else {
        throw new Error(response.message || "URL upload failed");
      }
    } catch (error: any) {
      console.error("Error with URL upload:", error);
      setErrorMessage(error.message || "URL upload is not fully supported yet");
      setWorkflowState(WorkflowState.ERROR);
    }
  };

  // Function to poll for summary status
  const pollSummaryStatus = async (summaryId: string) => {
    try {
      // Keep polling until we get a success or error
      let attempts = 0;
      const maxAttempts = 30; // Stop after 30 attempts (roughly 1.5 minutes)
      
      const checkStatus = async () => {
        try {
          // Get the summary status
          const summary = await summaryService.getSummaryById(summaryId, "user123");
          
          // If successful, move to complete state
          if (summary.status === 'success') {
            setProcessingProgress(100);
            setTimeout(() => {
              setWorkflowState(WorkflowState.COMPLETE);
              toast.success("Summary created successfully!");
            }, 500);
            return;
          }
          
          // If error, show error state
          if (summary.status === 'error') {
            throw new Error(summary.error_message || "Summary processing failed");
          }
          
          // Still processing, continue polling
          attempts++;
          if (attempts >= maxAttempts) {
            throw new Error("Summary processing timed out");
          }
          
          // Check again after a delay
          setTimeout(checkStatus, 3000);
        } catch (error: any) {
          console.error("Error polling summary status:", error);
          setErrorMessage(error.message || "Failed to check summary status");
          setWorkflowState(WorkflowState.ERROR);
        }
      };
      
      // Start polling
      checkStatus();
    } catch (error: any) {
      console.error("Error starting polling:", error);
      setErrorMessage(error.message || "Failed to start summary polling");
      setWorkflowState(WorkflowState.ERROR);
    }
  };

  // Function to handle preferences submission
  const handlePreferencesSubmit = async (preferences: SummaryPreferences) => {
    setWorkflowState(WorkflowState.PROCESSING);
    setProcessingProgress(0);
    
    try {
      // Update document metadata with preferences
      if (uploadedFile && uploadedFile.id) {
        // Convert preferences to string/JSON for storage
        const metadata = JSON.stringify({
          title: preferences.title,
          outputType: preferences.outputType,
          language: preferences.language,
          noteLength: preferences.noteLength,
          structureFormat: preferences.structureFormat,
          pageRange: preferences.pageRange,
          customPrompt: preferences.customPrompt,
          isPublic: preferences.isPublic,
          allowPdfViewing: preferences.allowPdfViewing,
          customPageRange: preferences.customPageRange
        });
        
        // Update the document metadata
        await documentService.updateDocumentMetadata(uploadedFile.id, metadata);
        
        // Update page count if it was provided in preferences
        if (preferences.pageRange === "custom" && preferences.customPageRange) {
          // This is a simplification - in reality, you'd need more complex logic
          // to calculate the actual page count from a custom range
          const pageCount = uploadedFile.pages; // Default to existing pages
          await documentService.updateDocumentPageCount(uploadedFile.id, pageCount);
        }
        
        // Add the file to the app context
        addFile({
          id: uploadedFile.id.toString(),
          name: preferences.title || uploadedFile.name,
          type: uploadedFile.type,
          size: uploadedFile.size,
          publicUrl: uploadedFile.url,
          uploadedAt: new Date()
        });
        
        // Now create the summary request to the AI service
        if (preferences.outputType !== "none") {
          // Get the userId from your authentication context
          // This is a placeholder - replace with your actual user ID retrieval method
          const userId = "current-user-id"; // TODO: Replace with actual user ID from auth context
          
          // Create the summary request based on the output type
          const summaryRequest: SummaryCreate = {
            content_url: uploadedFile.url,
            summary_length: preferences.noteLength === "in-depth" ? "long" : "medium",
            tags: []
          };
          
          // Add custom prompt if provided
          if (preferences.customPrompt) {
            summaryRequest.prompt = preferences.customPrompt;
          } else {
            // Create a prompt based on preferences
            const outputTypePrompt = preferences.outputType === "notes" 
              ? "Create detailed notes" 
              : preferences.outputType === "flashcards"
              ? "Create flashcards with questions and answers"
              : preferences.outputType === "quiz"
              ? "Create a quiz with questions and answers"
              : "Summarize the document";
              
            const structurePrompt = preferences.structureFormat === "outline"
              ? "in outline format"
              : preferences.structureFormat === "paragraph"
              ? "in paragraph format"
              : preferences.structureFormat === "by-page"
              ? "organized by page number"
              : "";
              
            summaryRequest.prompt = `${outputTypePrompt} ${structurePrompt} in ${preferences.language} language.`;
          }
          
          try {
            // Send the request to the AI service
            const summaryResponse = await summaryService.createSummary(summaryRequest);
            
            // Handle the response based on its status
            if (summaryResponse.status === 'success') {
              // Summary is immediately available
              console.log("Summary created successfully:", summaryResponse.summary_id);
              setSummaryId(summaryResponse.summary_id);
              setProcessingProgress(100);
              setTimeout(() => {
                setWorkflowState(WorkflowState.COMPLETE);
                toast.success("Summary created successfully!");
              }, 500);
            } else if (summaryResponse.status === 'processing') {
              // Summary is being processed, start polling for updates
              setSummaryId(summaryResponse.summary_id || "");
              if (summaryResponse.summary_id) {
                pollSummaryStatus(summaryResponse.summary_id);
              } else {
                throw new Error("No summary ID received from server");
              }
            } else {
              // Error occurred
              throw new Error(summaryResponse.error_message || "Summary generation failed");
            }
          } catch (error: any) {
            console.error("Error creating summary:", error);
            setErrorMessage(error.message || "Summary generation failed");
            setWorkflowState(WorkflowState.ERROR);
          }
        } else {
          // No summary requested, go to complete state
          setWorkflowState(WorkflowState.COMPLETE);
        }
      } else {
        throw new Error("No file upload information found");
      }
    } catch (error: any) {
      console.error("Error processing document:", error);
      setErrorMessage(error.message || "Unknown error during processing");
      setWorkflowState(WorkflowState.ERROR);
    }
  };

  // Reset the workflow
  const resetWorkflow = () => {
    setWorkflowState(WorkflowState.UPLOAD);
    setUploadProgress(0);
    setProcessingProgress(0);
    setUploadedFile(null);
    setErrorMessage("");
    setSummaryId(null);
  };

  const viewSummary = () => {
    if (summaryId) {
      router.push(`/dashboard/save-summaries/${summaryId}`);
    } else {
      // If no summary was created, navigate to the document viewer
      router.push(`/documents/${uploadedFile?.id}`);
    }
  };

  // Show different content based on workflow state
  const renderContent = () => {
    switch (workflowState) {
      case WorkflowState.UPLOAD:
        return (
          <UploadForm 
            activeTab="pdf" 
            onFileUpload={handleFileUpload}
            onUrlUpload={handleUrlUpload}
          />
        );
        
      case WorkflowState.UPLOADING:
        return (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <h3 className="text-xl font-medium mb-2">Uploading your document...</h3>
            <p className="text-muted-foreground mb-4">Please wait while we upload your file.</p>
            <div className="w-full max-w-md mx-auto h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary" 
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{uploadProgress}%</p>
          </div>
        );
        
      case WorkflowState.PREFERENCES:
        if (uploadedFile) {
          return (
            <SummaryPreferencesForm
              fileName={uploadedFile.name}
              fileSize={formatFileSize(uploadedFile.size)}
              filePages={uploadedFile.pages}
              onSubmit={handlePreferencesSubmit}
              onCancel={resetWorkflow}
            />
          );
        }
        return null;
        
      case WorkflowState.PROCESSING:
        return (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <h3 className="text-xl font-medium mb-2">Creating your summary...</h3>
            <p className="text-muted-foreground mb-4">Our AI is analyzing your document and creating your summary.</p>
            <div className="w-full max-w-md mx-auto h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary" 
                style={{ width: `${processingProgress}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">This may take a minute or two...</p>
          </div>
        );

      case WorkflowState.COMPLETE:
        return (
          <div className="text-center py-12">
            <div className="h-12 w-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="text-xl font-medium mb-2">Summary Created Successfully!</h3>
            <p className="text-muted-foreground mb-6">Your document has been processed and is now ready to view.</p>
            <div className="flex justify-center gap-4">
              <Button onClick={resetWorkflow}>Upload Another Document</Button>
              <Button variant="outline" onClick={viewSummary}>
                View Summary
              </Button>
            </div>
          </div>
        );

      case WorkflowState.ERROR:
        return (
          <div className="text-center py-12">
            <div className="h-12 w-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </div>
            <h3 className="text-xl font-medium mb-2">Upload Failed</h3>
            <p className="text-muted-foreground mb-6">{errorMessage || "There was an error processing your request."}</p>
            <Button onClick={resetWorkflow}>Try Again</Button>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div ref={containerRef} className="w-full">
      <div ref={contentRef} className="w-full">
        {renderContent()}
      </div>
    </div>
  );
}

// Helper function to format file size
function formatFileSize(sizeInBytes: number): string {
  if (sizeInBytes < 1024) {
    return sizeInBytes + " B";
  } else if (sizeInBytes < 1024 * 1024) {
    return (sizeInBytes / 1024).toFixed(1) + " KB";
  } else {
    return (sizeInBytes / (1024 * 1024)).toFixed(1) + " MB";
  }
}