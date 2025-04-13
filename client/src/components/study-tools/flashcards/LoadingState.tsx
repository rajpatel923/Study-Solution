"use client";

import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message: string;
  progress?: number;
  subMessage?: string;
}

export default function LoadingState({
  message,
  progress = -1, // -1 means indeterminate
  subMessage,
}: LoadingStateProps) {
  const loaderRef = useRef<HTMLDivElement>(null);
  const messageRef = useRef<HTMLHeadingElement>(null);
  
  useEffect(() => {
    // Create a pulse animation for the loader
    if (loaderRef.current) {
      gsap.to(loaderRef.current, {
        scale: 1.1,
        duration: 0.8,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });
    }
    
    // Fade in the message
    if (messageRef.current) {
      gsap.fromTo(
        messageRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
      );
    }
  }, []);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] py-12 px-4">
      <div ref={loaderRef} className="mb-6">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
      
      <h2 ref={messageRef} className="text-2xl font-bold mb-3 text-center">
        {message}
      </h2>
      
      {subMessage && (
        <p className="text-muted-foreground text-center max-w-md mb-6">
          {subMessage}
        </p>
      )}
      
      {progress > 0 && (
        <div className="w-full max-w-xs">
          <div className="w-full bg-muted rounded-full h-2.5">
            <div 
              className="bg-primary h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            {Math.round(progress)}%
          </p>
        </div>
      )}
    </div>
  );
}