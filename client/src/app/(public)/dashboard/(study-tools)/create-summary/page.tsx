"use client";

import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import SummaryOptions from "@/components/study-tools/summarizer/SummaryOptions";
import DocumentList from "@/components/study-tools/summarizer/DocumentList";
import DemoSection from "@/components/study-tools/summarizer/DemoSection";
import { AppProvider } from "@/context/AppContext";
import SummaryCTA from "@/components/study-tools/summarizer/summaryCTA";

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
      <div className="relative">
        <div
          ref={containerRef}
          className="w-full min-h-[calc(100vh-4rem)]  p-6 lg:p-8"
        >
          <SummaryCTA />
          <SummaryOptions />
          <DocumentList />
          <DemoSection />
        </div>
      </div>
    </AppProvider>
  );
};

export default Summarizer;