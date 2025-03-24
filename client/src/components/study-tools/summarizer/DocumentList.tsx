"use client";

import React, { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { useAppContext } from "@/context/AppContext";
import { FileText, CheckCircle, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DocumentList() {
  const { files, results, setCurrentFile, setCurrentResult, removeFile } = useAppContext();
  const listRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!listRef.current || files.length === 0) return;
    
    // Animate new items
    const items = listRef.current.querySelectorAll('.document-item');
    const newItem = items[items.length - 1];
    
    if (newItem) {
      gsap.from(newItem, {
        opacity: 0,
        y: 20,
        duration: 0.4,
        ease: "power2.out"
      });
    }
  }, [files.length]);
  
  if (files.length === 0) {
    return null;
  }
  
  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Your Documents</h2>
        <Button variant="ghost" size="sm">View All</Button>
      </div>
      
      <div ref={listRef} className="space-y-3">
        {files.map((file) => {
          const result = results.find((r) => r.fileId === file.id);
          
          return (
            <div 
              key={file.id}
              className="document-item bg-card rounded-lg p-4 hover:bg-accent/50 transition-colors duration-200 cursor-pointer border shadow-sm"
              onClick={() => {
                setCurrentFile(file);
                if (result) setCurrentResult(result);
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-primary/10 p-2 rounded-md mr-3">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{file.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Intl.DateTimeFormat('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }).format(file.uploadedAt)}
                      {' • '}
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {result ? (
                    <div className="text-green-500 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      <span className="text-sm">Processed</span>
                    </div>
                  ) : (
                    <div className="text-amber-500 flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      <span className="text-sm">Processing</span>
                    </div>
                  )}
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full opacity-70 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(file.id);
                    }}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Remove</span>
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
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