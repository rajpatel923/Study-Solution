"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className
}: PaginationProps) {
  const pages = useMemo(() => {
    // Always show first and last page
    // Show 5 page numbers including current, first, and last
    const pageNumbers = [];
    
    if (totalPages <= 7) {
      // If total pages is 7 or less, show all pages
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always add first page
      pageNumbers.push(1);
      
      if (currentPage > 3) {
        // Add ellipsis if current page is far from start
        pageNumbers.push(-1); // -1 represents ellipsis
      }
      
      // Add pages around current page
      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        // Add ellipsis if current page is far from end
        pageNumbers.push(-2); // -2 represents ellipsis at end
      }
      
      // Always add last page
      pageNumbers.push(totalPages);
    }
    
    return pageNumbers;
  }, [currentPage, totalPages]);
  
  return (
    <nav
      className={cn(
        "flex justify-center items-center space-x-1",
        className
      )}
      aria-label="Pagination"
    >
      {/* Previous Button */}
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className={cn(
          "relative inline-flex items-center px-2 py-2 rounded-md text-sm font-medium",
          currentPage === 1
            ? "text-gray-300 cursor-not-allowed"
            : "text-gray-700 hover:bg-gray-50"
        )}
      >
        <span className="sr-only">Previous</span>
        <ChevronLeft className="h-5 w-5" />
      </button>
      
      {/* Page Numbers */}
      {pages.map((page, index) => {
        if (page === -1 || page === -2) {
          // Render ellipsis
          return (
            <span
              key={`ellipsis-${index}`}
              className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700"
            >
              ...
            </span>
          );
        }
        
        return (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            aria-current={currentPage === page ? "page" : undefined}
            className={cn(
              "relative inline-flex items-center px-4 py-2 rounded-md text-sm font-medium",
              currentPage === page
                ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                : "bg-white text-gray-700 hover:bg-gray-50"
            )}
          >
            {page}
          </button>
        );
      })}
      
      {/* Next Button */}
      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className={cn(
          "relative inline-flex items-center px-2 py-2 rounded-md text-sm font-medium",
          currentPage === totalPages
            ? "text-gray-300 cursor-not-allowed"
            : "text-gray-700 hover:bg-gray-50"
        )}
      >
        <span className="sr-only">Next</span>
        <ChevronRight className="h-5 w-5" />
      </button>
    </nav>
  );
}