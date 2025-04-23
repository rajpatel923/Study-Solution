"use client";

import React, { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import { Upload, Link2, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import KaiMascot from "./KaiMascot";

interface UploadFormProps {
  activeTab: string;
  onFileUpload?: (file: File) => void;
  onUrlUpload?: (url: string) => void;
  isLoading?: boolean;
  submitButtonText?: string;
  fileTypes?: string[];
  acceptedFileExtensions?: string;
  dropzoneText?: string;
}

export default function UploadForm({ 
  activeTab, 
  onFileUpload, 
  onUrlUpload,
  isLoading = false,
  submitButtonText = "Process",
  fileTypes = [],
  acceptedFileExtensions = "", 
  dropzoneText = ""
}: UploadFormProps) {
  const formRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropAreaRef = useRef<HTMLDivElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [url, setUrl] = useState("");
  
  useEffect(() => {
    // Animate form elements when tab changes
    if (formRef.current) {
      const elements = formRef.current.querySelectorAll('.animate-item');
      
      gsap.fromTo(elements, 
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, stagger: 0.1, duration: 0.4, ease: "power2.out" }
      );
    }
  }, [activeTab]);
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
    
    if (dropAreaRef.current) {
      gsap.to(dropAreaRef.current, { 
        borderColor: 'hsl(var(--primary))', 
        backgroundColor: 'hsl(var(--primary) / 0.05)',
        duration: 0.2 
      });
    }
  };
  
  const handleDragLeave = () => {
    setDragActive(false);
    
    if (dropAreaRef.current) {
      gsap.to(dropAreaRef.current, { 
        borderColor: 'hsl(var(--border))', 
        backgroundColor: 'transparent',
        duration: 0.2 
      });
    }
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleDragLeave();
    
    if (!onFileUpload) return;
    
    const files = e.dataTransfer.files;
    if (files.length) {
      // Take the first file
      handleFile(files[0]);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !onFileUpload) return;
    
    handleFile(e.target.files[0]);
  };
  
  const handleFile = (file: File) => {
    // Validate file type based on activeTab or fileTypes prop
    if (activeTab === 'pdf' && file.type !== 'application/pdf' && !fileTypes.includes(file.type)) {
      alert('Please upload a PDF file');
      return;
    }
    
    // For flashcards, we might want to support more file types
    if (fileTypes.length > 0 && !fileTypes.includes(file.type)) {
      alert(`Please upload one of the following file types: ${fileTypes.join(', ')}`);
      return;
    }
    
    // Call the callback with the file
    if (onFileUpload) {
      onFileUpload(file);
    }
  };
  
  const handleClick = () => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };
  
  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url || !onUrlUpload) return;
    
    // Basic URL validation
    try {
      new URL(url);
      onUrlUpload(url);
    } catch (err) {
      alert('Please enter a valid URL');
    }
  };
  
  const getTabTitle = () => {
    // Use custom dropzoneText if provided
    if (dropzoneText) return dropzoneText;
    
    switch (activeTab) {
      case 'pdf': return 'PDF';
      case 'ppt': return 'PowerPoint';
      case 'video': return 'YouTube Video';
      case 'lecture': return 'Lecture Notes';
      case 'excel': return 'Excel';
      default: return 'Document';
    }
  };
  
  // Determine accept attribute for input
  const getAcceptString = () => {
    if (acceptedFileExtensions) return acceptedFileExtensions;
    
    switch (activeTab) {
      case 'pdf': return ".pdf, pptx, ppt";
      case 'ppt': return ".ppt,.pptx";
      case 'video': return ".mp4,.webm";
      case 'excel': return ".xls,.xlsx,.csv";
      default: return undefined;
    }
  };
  
  return (
    <div ref={formRef} className="w-full">
      {/* URL Input for all tabs */}
      <form onSubmit={handleUrlSubmit} className="animate-item mb-6">
        <div className="relative w-full">
          <div className="flex bg-background">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Link2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <Input
                type="text"
                placeholder={`Paste a link from Youtube, Canvas, Google Drive, etc.`}
                className="pl-10 pr-20"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="ml-2 whitespace-nowrap" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                submitButtonText
              )}
            </Button>
          </div>
        </div>
      </form>
      
      {/* Divider */}
      <div className="animate-item flex items-center my-6">
        <div className="flex-grow border-t border-border"></div>
        <span className="mx-4 text-muted-foreground">or</span>
        <div className="flex-grow border-t border-border"></div>
      </div>
      
      {/* File Upload Area */}
      <div 
        ref={dropAreaRef}
        onClick={isLoading ? undefined : handleClick}
        onDragOver={isLoading ? undefined : handleDragOver}
        onDragLeave={isLoading ? undefined : handleDragLeave}
        onDrop={isLoading ? undefined : handleDrop}
        className={`animate-item relative w-full border-2 border-dashed border-border rounded-lg h-48 flex flex-col items-center justify-center mb-6 ${isLoading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer transition-colors duration-300'} ${dragActive ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}
      >
        <div className="text-center relative z-10">
          {isLoading ? (
            <>
              <div className="mb-4 text-primary">
                <Loader2 className="h-8 w-8 mx-auto animate-spin" />
              </div>
              <p className="text-foreground mb-2">Processing your file...</p>
              <p className="text-muted-foreground text-sm">Please wait</p>
            </>
          ) : (
            <>
              <div className="mb-4 text-primary">
                <Upload className="h-8 w-8 mx-auto" />
              </div>
              <p className="text-foreground mb-2">Drag & drop a {getTabTitle()} to upload</p>
              <p className="text-muted-foreground text-sm">Or, select file</p>
              <input
                ref={inputRef}
                type="file"
                id="file-upload"
                className="hidden"
                accept={getAcceptString()}
                onChange={handleFileChange}
                disabled={isLoading}
              />
            </>
          )}
        </div>
        
        {/* Kai Mascot */}
        <div className="absolute right-4 bottom-0">
          <KaiMascot />
        </div>
      </div>
      
      {/* Google Drive Option */}
      <div className="animate-item text-center">
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-primary/80 hover:text-primary"
          disabled={isLoading}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Or, upload from Google Drive
        </Button>
      </div>
      
      {/* Terms of Service */}
      <div className="animate-item mt-8 text-xs text-muted-foreground text-center px-4">
        By uploading your file to Knowt, you acknowledge that you agree to Knowt's 
        <Button variant="link" className="px-1 h-auto text-xs text-primary">Terms of Service & Community Guidelines</Button>. 
        Please be sure not to violate others' copyright or privacy rights.
      </div>
    </div>
  );
}