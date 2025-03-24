"use client";

import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import SummaryOptions from "@/components/study-tools/summarizer/SummaryOptions";
import DocumentList from "@/components/study-tools/summarizer/DocumentList";
import DemoSection from "@/components/study-tools/summarizer/DemoSection";
import StatsSection from "@/components/study-tools/summarizer/StateSection";
import { AppProvider } from "@/context/AppContext";
import AnimatedBackground from "@/components/study-tools/summarizer/AnimatedBackground";
const Summarizer = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  useEffect(() => {
    if (containerRef.current) {
      // Main container entrance animation
      gsap.from(containerRef.current, {
        opacity: 0,
        y: 20,
        duration: 0.6,
        ease: "power2.out",
      });
    }
  }, []);
  
  return (
    <AppProvider>
      <div className="relative   overflow-y-auto">
        {/* Animated Background for visual interest */}
        <AnimatedBackground />
        
        <div 
          ref={containerRef} 
          className="w-full min-h-[calc(100vh-4rem)]  p-6 lg:p-8"
        >
          {/* Top Section: Summarizer Options */}
          <SummaryOptions />
          
          {/* Document List - Will only appear when documents are added */}
          <DocumentList />
          
          {/* Demo Section to show the functionality */}
          <DemoSection />
          
          {/* Stats Section */}
          <StatsSection />
        </div>
      </div>
    </AppProvider>
  );
};

export default Summarizer;