"use client";

import React from "react";

import SummaryOptions from "@/components/study-tools/summarizer/SummaryOptions";
import DocumentList from "@/components/study-tools/summarizer/DocumentList";
import DemoSection from "@/components/study-tools/summarizer/DemoSection";
import SummaryCTA from "@/components/study-tools/summarizer/summaryCTA";

const Summarizer = () => {
  return (
      <div className="relative">
        <div
          className="w-full min-h-[calc(100vh-4rem)]  p-6 lg:p-8"
        >
          <SummaryCTA />
          <SummaryOptions />
          <DocumentList />
          <DemoSection />
        </div>
      </div>
  );
};

export default Summarizer;