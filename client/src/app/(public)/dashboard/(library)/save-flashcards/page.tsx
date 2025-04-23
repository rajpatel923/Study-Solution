"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import flashcardService, { Flashcard } from "@/services/flashcardService";
import FlashcardList from "@/components/library/flashcards/FlashcardList";
import FlashcardFilters from "@/components/library/flashcards/FlashcardFilters";
import FlashcardStats from "@/components/library/flashcards/FlashcardStats";
import PageHeader from "@/components/library/flashcards/PageHeader";
import Pagination from "@/components/library/flashcards/Pagination";
import EmptyState from "@/components/library/flashcards/EmptyState";
import LoadingSpinner from "@/components/library/flashcards/LoadingSpinner";
import FlashcardSetList from "@/components/library/flashcards/FlashcardList";



export default function SavedFlashcardsPage() {
  // Simple userId - you would typically get this from your auth system
  const userId = "5"; // Replace with actual user ID or from your auth context
  
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("cards");
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [flashcardSets, setFlashcardSets] = useState<any[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState<boolean>(true);
  const [isLoadingSets, setIsLoadingSets] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalFlashcards, setTotalFlashcards] = useState<number>(0);
  const [filters, setFilters] = useState({
    difficulty: "",
    contentType: "",
    tag: ""
  });

  const flashcardsPerPage = 10;
  const totalPages = Math.ceil(totalFlashcards / flashcardsPerPage);

  useEffect(() => {
    // Check for tab parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    
    if (tabParam && (tabParam === 'cards' || tabParam === 'sets')) {
      setActiveTab(tabParam);
    }
    
    fetchFlashcardSets();
    fetchFlashcards();
  }, [currentPage, filters]);

  const fetchFlashcards = async () => {
    if (activeTab !== "cards" && currentPage === 1) {
      // Don't fetch cards if not on the cards tab and it's the first load
      return;
    }
    
    setIsLoadingCards(true);
    try {
      const response = await flashcardService.getAllFlashcards(
        userId,
        flashcardsPerPage,
        filters.contentType,
        filters.tag,
        filters.difficulty
      );

      if (response.status === "success" && response.flashcards) {
        setFlashcards(response.flashcards);
        setTotalFlashcards(response.count || 0);
      } else {
        toast.error("Failed to load flashcards");
      }
    } catch (error) {
      console.error("Error fetching flashcards:", error);
      toast.error("Failed to load flashcards");
    } finally {
      setIsLoadingCards(false);
    }
  };

  const fetchFlashcardSets = async () => {
    if (activeTab !== "sets" && flashcardSets.length > 0) {
      // Don't fetch sets if not on the sets tab and we already have sets
      return;
    }
    
    setIsLoadingSets(true);
    try {
      const response = await flashcardService.getAllFlashcardSets(userId);

      if (response.status === "success" && response.flashcard_sets) {
        setFlashcardSets(response.flashcard_sets);
      } else {
        toast.error("Failed to load flashcard sets");
      }
    } catch (error) {
      console.error("Error fetching flashcard sets:", error);
      toast.error("Failed to load flashcard sets");
    } finally {
      setIsLoadingSets(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Smooth scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFilterChange = (newFilters: any) => {
    setFilters({ ...filters, ...newFilters });
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleFlashcardClick = (flashcardId: string) => {
    router.push(`/dashboard/save-flashcards/${flashcardId}`);
  };

  const handleSetClick = (setId: string) => {
    router.push(`/dashboard/save-flashcards/${setId}`);
  };

  const handleDeleteSet = async (setId: string) => {
    if (confirm("Are you sure you want to delete this set? All flashcards in this set will also be deleted.")) {
      // Implement delete set functionality
      toast.success("Set deleted successfully");
      // Refetch sets after deletion
      fetchFlashcardSets();
    }
  };

  const handleEditSet = (setId: string) => {
    router.push(`/dashboard/edit-flashcard-set/${setId}`);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Fetch data for the selected tab if needed
    if (value === "cards" && flashcards.length === 0) {
      fetchFlashcards();
    } else if (value === "sets" && flashcardSets.length === 0) {
      fetchFlashcardSets();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto px-4 py-8 max-w-6xl"
    >
      <PageHeader 
        title="Saved Flashcards" 
        description="Review and manage your saved flashcards"
        actionLabel="Create New Flashcards"
        actionUrl="/dashboard/create-flashcards"
      />

      {!isLoadingCards && flashcards.length > 0 && activeTab === "cards" && (
        <FlashcardStats flashcards={flashcards} className="mb-8" />
      )}

      <Tabs defaultValue="cards" value={activeTab} onValueChange={handleTabChange} className="mb-8">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="cards">Individual Cards</TabsTrigger>
          <TabsTrigger value="sets">Flashcard Sets</TabsTrigger>
        </TabsList>
        
        <TabsContent value="cards">
          <FlashcardFilters
            filters={filters}
            onChange={handleFilterChange}
            className="mb-8"
          />

          {isLoadingCards ? (
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner size="lg" />
            </div>
          ) : flashcards.length > 0 ? (
            <>
              <FlashcardList 
                flashcardSets={flashcardSets} 
                onSetClick={handleFlashcardClick} 
              />
              
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  className="mt-8"
                />
              )}
            </>
          ) : (
            <EmptyState
              title="No flashcards found"
              description="You haven't created any flashcards yet or no flashcards match your filters."
              actionLabel="Create Flashcards"
              actionUrl="/create-flashcard"
            />
          )}
        </TabsContent>
        
        <TabsContent value="sets">
          {isLoadingSets ? (
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner size="lg" />
            </div>
          ) : flashcardSets.length > 0 ? (
            <FlashcardSetList 
              flashcardSets={flashcardSets} 
              onSetClick={handleSetClick}
              onDeleteSet={handleDeleteSet}
              onEditSet={handleEditSet}
            />
          ) : (
            <EmptyState
              title="No flashcard sets found"
              description="You haven't created any flashcard sets yet."
              actionLabel="Create Flashcard Set"
              actionUrl="/create-flashcard-set"
            />
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}