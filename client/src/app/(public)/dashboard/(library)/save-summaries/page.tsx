"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import summaryService from "@/services/summaryService";
import PageHeader from "@/components/library/summary/PageHeader";
import SummaryGrid from "@/components/library/summary/SummaryGrid";
import SummaryFilters from "@/components/library/summary/SummaryFilters";
import StatsCard from "@/components/library/summary/StatsCard";
import LoadingSpinner from "@/components/library/summary/LoadingSpinner";
import EmptyState from "@/components/library/summary/EmptyState";
import { toast } from "sonner";
import { Summary, SummariesResponse } from "@/lib/summary";
import {useAuth} from "@/context/AuthContext";

export default function SavedSummariesPage() {
  const router = useRouter();
  const {user} = useAuth();
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [filteredSummaries, setFilteredSummaries] = useState<Summary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState("newest");
  const [filters, setFilters] = useState({
    contentType: [] as string[],
    length: [] as string[],
    dateRange: "all",
    searchQuery: ""
  });
  const userId = user?.id

  useEffect(() => {
    // Animation for page entrance
    const tl = gsap.timeline();
    tl.fromTo(
      ".page-content",
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
    );

    fetchSummaries();
  }, []);

  const fetchSummaries = async () => {
    try {
      setIsLoading(true);
      const response = await summaryService.getUserSummaries(userId, limit) as unknown as SummariesResponse;
      
      if (response.status === "success") {
        setSummaries(response.summaries);
        setFilteredSummaries(response.summaries);
        setTotalCount(response.count);
      } else {
        toast.error("Failed to load summaries");
      }
    } catch (error) {
      console.error("Error fetching summaries:", error);
      toast.error("Failed to load summaries");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSummaryClick = useCallback((summaryId: string) => {
    router.push(`/dashboard/save-summaries/${summaryId}`);
  }, [router]);

  const handleLoadMore = useCallback(() => {
    setLimit(prev => prev + 10);
    fetchSummaries();
  }, []);

  const handleDeleteSummary = useCallback(async (summaryId: string) => {
    try {
      await summaryService.deleteSummary(summaryId, userId);
      // Refresh the summaries list
      fetchSummaries();
      toast.success("Summary deleted successfully");
    } catch (error) {
      console.error("Error deleting summary:", error);
    }
  }, [userId]);

  // Memoize the sortSummaries function
  const sortSummaries = useCallback((summariesToSort: Summary[], sortOption: string): Summary[] => {
    const sortedSummaries = [...summariesToSort];
    
    switch (sortOption) {
      case "newest":
        return sortedSummaries.sort((a, b) => {
          const dateA = new Date(a.last_updated || a.created_at).getTime();
          const dateB = new Date(b.last_updated || b.created_at).getTime();
          return dateB - dateA;
        });
        
      case "oldest":
        return sortedSummaries.sort((a, b) => {
          const dateA = new Date(a.last_updated || a.created_at).getTime();
          const dateB = new Date(b.last_updated || b.created_at).getTime();
          return dateA - dateB;
        });
        
      case "words-desc":
        return sortedSummaries.sort((a, b) => b.word_count - a.word_count);
        
      case "words-asc":
        return sortedSummaries.sort((a, b) => a.word_count - b.word_count);
        
      case "title-asc":
        return sortedSummaries.sort((a, b) => {
          const titleA = a.prompt_used?.toLowerCase() || "";
          const titleB = b.prompt_used?.toLowerCase() || "";
          return titleA.localeCompare(titleB);
        });
        
      case "title-desc":
        return sortedSummaries.sort((a, b) => {
          const titleA = a.prompt_used?.toLowerCase() || "";
          const titleB = b.prompt_used?.toLowerCase() || "";
          return titleB.localeCompare(titleA);
        });
        
      default:
        return sortedSummaries;
    }
  }, []);

  // Apply filters and sorting to summaries
  const applyFiltersAndSort = useCallback(() => {
    let result = [...summaries];
    
    // Filter by content type
    if (filters.contentType.length > 0) {
      result = result.filter(summary => 
        filters.contentType.includes(summary.content_type.toLowerCase())
      );
    }
    
    // Filter by length
    if (filters.length.length > 0) {
      result = result.filter(summary => 
        filters.length.includes(summary.length)
      );
    }
    
    // Filter by date range
    if (filters.dateRange !== "all") {
      const now = new Date();
      const dateThreshold = new Date();
      
      switch (filters.dateRange) {
        case "today":
          dateThreshold.setHours(0, 0, 0, 0);
          break;
        case "week":
          dateThreshold.setDate(now.getDate() - 7);
          break;
        case "month":
          dateThreshold.setMonth(now.getMonth() - 1);
          break;
        case "year":
          dateThreshold.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      result = result.filter(summary => {
        const summaryDate = new Date(summary.last_updated || summary.created_at);
        return summaryDate >= dateThreshold;
      });
    }
    
    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(summary => 
        summary.prompt_used?.toLowerCase().includes(query) ||
        summary.text.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    result = sortSummaries(result, sortBy);
    
    setFilteredSummaries(result);
  }, [filters, summaries, sortBy, sortSummaries]);

  // Apply filters and sorting when dependencies change
  useEffect(() => {
    applyFiltersAndSort();
  }, [applyFiltersAndSort]);

  // Memoize filter change handler
  const handleFilterChange = useCallback((newFilters: {
    contentType: string[];
    length: string[];
    dateRange: string;
    searchQuery: string;
  }) => {
    setFilters(newFilters);
  }, []);

  // Memoize sort change handler
  const handleSortChange = useCallback((newSortBy: string) => {
    setSortBy(newSortBy);
  }, []);

  return (
    <div className="container mx-auto p-6 lg:p-8 page-content">
      <PageHeader 
        totalCount={totalCount} 
        sortBy={sortBy}
        onSortChange={handleSortChange}
      />
      
      <SummaryFilters onFilterChange={handleFilterChange} />
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      ) : summaries.length === 0 ? (
        <EmptyState />
      ) : filteredSummaries.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-700 mb-2">No summaries match your filters</h3>
          <p className="text-gray-500">Try adjusting your filters or create a new summary.</p>
          <button
            onClick={() => setFilters({
              contentType: [],
              length: [],
              dateRange: "all",
              searchQuery: ""
            })}
            className="mt-4 px-4 py-2 text-blue-600 hover:text-blue-800"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <>
          {/* Display stats card if we have summaries */}
          {summaries.length > 0 && (
            <StatsCard summaries={summaries} />
          )}
          
          <SummaryGrid 
            summaries={filteredSummaries}
            onSummaryClick={handleSummaryClick}
            onDeleteSummary={handleDeleteSummary}
          />
          
          {summaries.length < totalCount && filteredSummaries.length === summaries.length && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={handleLoadMore}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Load More
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}