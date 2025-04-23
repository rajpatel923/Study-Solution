"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import Link from "next/link";

const EmptyState: React.FC = () => {
  const emptyStateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (emptyStateRef.current) {
      gsap.fromTo(
        emptyStateRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.7, ease: "back.out(1.4)", delay: 0.2 }
      );
    }
  }, []);

  return (
    <div 
      ref={emptyStateRef}
      className="flex flex-col items-center justify-center text-center py-16 px-4"
    >
      <div className="bg-blue-50 p-6 rounded-full mb-6">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-16 w-16 text-blue-500" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5} 
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
          />
        </svg>
      </div>
      
      <h3 className="text-2xl font-semibold text-gray-800 mb-2">No summaries yet</h3>
      
      <p className="text-gray-600 max-w-md mb-8">
        Create your first summary to organize and store important information from various sources.
      </p>
      
      <Link
        href="/dashboard/create-summary"
        className="bg-blue-600 text-white py-3 px-8 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 mr-2"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
            clipRule="evenodd"
          />
        </svg>
        Create New Summary
      </Link>
    </div>
  );
};

export default EmptyState;