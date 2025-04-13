"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import summaryService from "@/services/summaryService";
import { useAppContext } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
// import TipTapEditor from "@/components/common/tiptap-editor/TipTapEditor";
import EnhancedEditor from "@/components/common/tiptap-editor/pEditor";

// Optional: Add a function to convert plain markdown to HTML if needed
const convertMarkdownToHTML = (markdown) => {
  // This is a very basic conversion - you might want to use a proper library
  // For testing only - replace this with a proper markdown library
  return markdown;
};

const SummaryEditPage = () => {
  const params = useParams();
  
  // Handle both string and array versions of the parameter
  const rawSummaryId = params?.summaryId;
  const summaryId = Array.isArray(rawSummaryId) ? rawSummaryId[0] : rawSummaryId;
  
  console.log("Raw params:", params);
  console.log("Extracted summaryId:", summaryId);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { 
    editorContent, 
    setEditorContent, 
    documentMetadata, 
    setDocumentMetadata
  } = useAppContext();

  useEffect(() => {
    const fetchSummary = async () => {
      // Add explicit check for summaryId
      if (!summaryId || summaryId === 'undefined') {
        console.error("No valid summaryId found in URL parameters");
        setError("No summary ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Use the user_id parameter for authentication
        const userId = "user123"; // Replace with your auth system's user ID
        const result = await summaryService.getSummaryById(summaryId, userId);
        
        if (result.status === "success" && result.summary) {
          console.log("Received summary content:", result.summary.substring(0, 100) + "...");
          
          // The key part: Set the raw markdown content
          // TipTap with Markdown extension will parse it correctly
          setEditorContent(result.summary);
          
          setDocumentMetadata({
            documentId: result.document_id || "",
            summaryId: result.summary_id || "",
            wordCount: result.word_count || 0,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
          });
        } else {
          console.error("API returned success but no summary data", result);
          setError("Failed to load summary: No summary data returned");
          toast.error("Failed to load summary");
        }
      } catch (error: any) {
        console.error("Error fetching summary:", error);
        setError(`Error loading summary: ${error.message || "Unknown error"}`);
        toast.error("Error loading summary");
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [summaryId, setEditorContent, setDocumentMetadata]);

  const handleSave = async () => {
    if (!documentMetadata?.summaryId) {
      toast.error("No summary ID found");
      return;
    }

    try {
      setSaving(true);
      
      // Include the user_id in the update request
      const userId = "current-user-id"; // Replace with your auth system's user ID
      await summaryService.updateSummary(documentMetadata.summaryId, {
        summary_content: editorContent,
        user_id: userId
      });
      
      toast.success("Summary saved successfully");
    } catch (error) {
      console.error("Error saving summary:", error);
      toast.error("Failed to save summary");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center flex-col">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <span className="text-lg">Loading summary...</span>
        <p className="text-sm text-gray-600 mt-2">Summary ID: {summaryId}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center flex-col">
        <div className="bg-red-50 text-red-800 p-4 rounded-lg max-w-lg">
          <h3 className="text-lg font-medium mb-2">Error</h3>
          <p>{error}</p>
          <p className="mt-4 text-sm">Summary ID: {summaryId}</p>
          <Link href="/dashboard" className="mt-4 inline-block">
            <Button variant="outline" className="mt-2">
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full pb-12">
      <header className="border-b p-4 bg-white shadow-sm flex justify-between items-center">
        <div className="flex items-center">
          <Link href="/dashboard" className="mr-4">
            <Button variant="ghost" size="icon">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <h1 className="text-xl font-semibold">Edit Summary</h1>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="flex items-center"
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save
        </Button>
      </header>
      
      <main className="flex-1 overflow-y-auto pb-12">
        <div className="w-full">
          {editorContent ? (
            // <TipTapEditor />
            <EnhancedEditor/>
          ) : (
            <div className="border rounded-lg p-8 text-center bg-gray-50">
              <p className="text-gray-600">No content available to edit</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SummaryEditPage;