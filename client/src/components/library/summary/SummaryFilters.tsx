"use client";

import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";

interface SummaryFiltersProps {
  onFilterChange: (filters: {
    contentType: string[];
    length: string[];
    dateRange: string;
    searchQuery: string;
  }) => void;
}

const SummaryFilters: React.FC<SummaryFiltersProps> = ({ onFilterChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [contentType, setContentType] = useState<string[]>([]);
  const [length, setLength] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  const filtersRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Animation for filter expansion/collapse
    if (filtersRef.current) {
      if (isExpanded) {
        gsap.to(filtersRef.current, {
          height: "auto",
          opacity: 1,
          duration: 0.3,
          ease: "power2.out"
        });
      } else {
        gsap.to(filtersRef.current, {
          height: 0,
          opacity: 0,
          duration: 0.3,
          ease: "power2.in"
        });
      }
    }
  }, [isExpanded]);
  
  // Apply filters when they change - with debounce to prevent excessive updates
  useEffect(() => {
    // Create a single object with all filter values
    const filterValues = {
      contentType,
      length,
      dateRange,
      searchQuery
    };
    
    // Use timeout to debounce filter changes
    const timeoutId = setTimeout(() => {
      onFilterChange(filterValues);
    }, 300);
    
    // Cleanup timeout on dependency changes
    return () => clearTimeout(timeoutId);
  }, [contentType, length, dateRange, searchQuery, onFilterChange]);
  
  // Toggle content type filter
  const toggleContentType = (type: string) => {
    if (contentType.includes(type)) {
      setContentType(contentType.filter(item => item !== type));
    } else {
      setContentType([...contentType, type]);
    }
  };
  
  // Toggle length filter
  const toggleLength = (lengthValue: string) => {
    if (length.includes(lengthValue)) {
      setLength(length.filter(item => item !== lengthValue));
    } else {
      setLength([...length, lengthValue]);
    }
  };
  
  // Reset all filters
  const resetFilters = () => {
    setContentType([]);
    setLength([]);
    setDateRange("all");
    setSearchQuery("");
  };
  
  return (
    <div className="mb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
        <div className="relative w-full md:w-96 mb-4 md:mb-0">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 text-gray-400" 
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path 
                fillRule="evenodd" 
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" 
                clipRule="evenodd" 
              />
            </svg>
          </div>
          <input
            type="text"
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5"
            placeholder="Search summaries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center mr-4 text-sm text-gray-700"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 mr-1 text-gray-500" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path 
                fillRule="evenodd" 
                d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" 
                clipRule="evenodd" 
              />
            </svg>
            {isExpanded ? "Hide Filters" : "Show Filters"}
          </button>
          
          {(contentType.length > 0 || length.length > 0 || dateRange !== "all" || searchQuery) && (
            <button
              onClick={resetFilters}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Reset All
            </button>
          )}
        </div>
      </div>
      
      <div 
        ref={filtersRef}
        className="overflow-hidden opacity-0 h-0"
      >
        <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Content Type Filters */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Content Type</h4>
            <div className="space-y-2">
              {["pdf", "webpage", "youtube"].map((type) => (
                <label key={type} className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded text-blue-600 focus:ring-blue-500"
                    checked={contentType.includes(type)}
                    onChange={() => toggleContentType(type)}
                  />
                  <span className="ml-2 text-sm text-gray-700 capitalize">{type}</span>
                </label>
              ))}
            </div>
          </div>
          
          {/* Length Filters */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Length</h4>
            <div className="space-y-2">
              {["short", "medium", "long"].map((lengthValue) => (
                <label key={lengthValue} className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded text-blue-600 focus:ring-blue-500"
                    checked={length.includes(lengthValue)}
                    onChange={() => toggleLength(lengthValue)}
                  />
                  <span className="ml-2 text-sm text-gray-700 capitalize">{lengthValue}</span>
                </label>
              ))}
            </div>
          </div>
          
          {/* Date Range Filter */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Date</h4>
            <select
              className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryFilters;