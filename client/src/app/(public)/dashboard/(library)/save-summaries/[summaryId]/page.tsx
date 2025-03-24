"use client";
import React from 'react'

import dynamic from 'next/dynamic';
import { AppProvider } from "@/context/AppContext";

// Use dynamic import to avoid hydration issues with client components
const SummaryEditPage = dynamic(() => import("@/components/study-tools/summarizer/SummaryEditorPage"), {
  ssr: false,
  loading: () => <div className="flex h-screen w-full items-center justify-center">
    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
    <span className="ml-3">Loading editor...</span>
  </div>
});
const Summary = () => {
  return (
    <AppProvider>
      <div className='w-full h-full'>
        <SummaryEditPage />
      </div>
    </AppProvider>
  )
}

export default Summary