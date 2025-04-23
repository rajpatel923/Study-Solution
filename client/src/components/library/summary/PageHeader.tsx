"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import Link from "next/link";
import SortOptions from "./SortOptions";

interface PageHeaderProps {
  totalCount: number;
  sortBy: string;
  onSortChange: (sortBy: string) => void;
}

const PageHeader: React.FC<PageHeaderProps> = ({ totalCount, sortBy, onSortChange }) => {
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (headerRef.current) {
      gsap.from(headerRef.current, {
        y: -20,
        opacity: 0,
        duration: 0.7,
        ease: "power3.out",
        delay: 0.2
      });
    }
  }, []);

  return (
    <div ref={headerRef} className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Saved Summaries</h1>
        <p className="text-gray-600 mt-1">
          {totalCount} {totalCount === 1 ? 'summary' : 'summaries'} saved in your account
        </p>
      </div>
      
      <div className="mt-4 md:mt-0 flex items-center space-x-4">
        <SortOptions onSortChange={onSortChange} currentSort={sortBy} />
        
        <Link
          href="/dashboard/create-summary"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
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
          New Summary
        </Link>
        
        <div className="relative">
          <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-gray-600"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 6a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 6a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          {/* Dropdown menu could be added here */}
        </div>
      </div>
    </div>
  );
};

export default PageHeader;