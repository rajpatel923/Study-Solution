"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Save, Download, Share2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { gsap } from "gsap";
import flashcardService, { Flashcard } from "@/services/flashcardService";
import FlashcardNavigation from "@/components/study-tools/flashcards/FlashcardNavigation";
import { toast } from "sonner";
import Link from "next/link";
import "@/app/(public)/dashboard/(study-tools)/create-flashcards/flashcard-styles.css";

const SavedFlashcardsPage = () => {
  const params = useParams();
  const router = useRouter();
  
  // Handle both string and array versions of the parameter
  const rawFlashcardSetId = params?.flashcardSetId;
  const flashcardSetId = Array.isArray(rawFlashcardSetId) ? rawFlashcardSetId[0] : rawFlashcardSetId;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [setDetails, setSetDetails] = useState<{
    title: string;
    description?: string;
    tags: string[];
    created_at: string;
    flashcard_count: number;
  } | null>(null);

  // Refs for animation
  const cardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchFlashcards = async () => {
      if (!flashcardSetId || flashcardSetId === 'undefined') {
        console.error("No valid flashcard set ID found in URL parameters");
        setError("No flashcard set ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Use the user_id parameter for authentication 
        const userId = "5"; // Replace with your auth system's user ID
        const response = await flashcardService.getFlashcardsBySet(flashcardSetId, userId);
        
        if (response.status === "success" && response.flashcards && response.flashcards.length > 0) {
          setFlashcards(response.flashcards);
          
          if (response.flashcard_set) {
            setSetDetails({
              title: response.flashcard_set.title || "Untitled Flashcard Set",
              description: response.flashcard_set.description,
              tags: response.flashcard_set.tags || [],
              created_at: response.flashcard_set.created_at,
              flashcard_count: response.flashcard_set.flashcard_count,
            });
          }
        } else {
          setError("No flashcards found in this set");
        }
      } catch (error: any) {
        console.error("Error fetching flashcards:", error);
        setError(`Error loading flashcards: ${error.message || "Unknown error"}`);
        toast.error("Error loading flashcards");
      } finally {
        setLoading(false);
      }
    };

    fetchFlashcards();
  }, [flashcardSetId]);

  // Initial animation when component mounts
  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
      );
    }
  }, []);

  // Flip animation
  const handleFlip = () => {
    if (cardRef.current) {
      // If already animating, don't start another animation
      if (gsap.isTweening(cardRef.current)) return;
      
      // Flip the card
      gsap.to(cardRef.current, {
        rotationY: isFlipped ? 0 : 180,
        duration: 0.06,
        ease: "power2.inOut",
        onComplete: () => {
          setIsFlipped(!isFlipped);
        }
      });
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      if (isFlipped) {
        // If the card is flipped, first unflip it
        handleFlip();
      }
      
      // Only proceed with transition after unflipping (or if not flipped)
      setTimeout(() => {
        // Slide current card out
        if (cardRef.current) {
          gsap.to(cardRef.current, {
            x: 100,
            opacity: 0,
            duration: 0.2,
            ease: "power2.in",
            onComplete: () => {
              setCurrentIndex(currentIndex - 1);
              
              // Reset position for previous card
              gsap.set(cardRef.current, { x: -100, opacity: 0 });
              
              // Slide previous card in
              gsap.to(cardRef.current, {
                x: 0,
                opacity: 1,
                duration: 0.3,
                ease: "power2.out"
              });
            }
          });
        }
      }, isFlipped ? 300 : 0);
    }
  };

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      if (isFlipped) {
        // If the card is flipped, first unflip it
        handleFlip();
      }
      
      // Only proceed with transition after unflipping (or if not flipped)
      setTimeout(() => {
        // Slide current card out
        if (cardRef.current) {
          gsap.to(cardRef.current, {
            x: -100,
            opacity: 0,
            duration: 0.2,
            ease: "power2.in",
            onComplete: () => {
              setCurrentIndex(currentIndex + 1);
              
              // Reset position for next card
              gsap.set(cardRef.current, { x: 100, opacity: 0 });
              
              // Slide next card in
              gsap.to(cardRef.current, {
                x: 0,
                opacity: 1,
                duration: 0.3,
                ease: "power2.out"
              });
            }
          });
        }
      }, isFlipped ? 300 : 0);
    }
  };

  const handleReviewFlashcard = async (confidenceLevel: number) => {
    if (!flashcards[currentIndex]) return;
    
    try {
      const userId = "user123"; // Replace with actual user ID from auth
      await flashcardService.reviewFlashcard(
        flashcards[currentIndex].id,
        confidenceLevel,
        userId
      );
      
      // Update the local flashcard data
      const updatedFlashcards = [...flashcards];
      updatedFlashcards[currentIndex] = {
        ...updatedFlashcards[currentIndex],
        confidence_level: confidenceLevel,
        review_count: updatedFlashcards[currentIndex].review_count + 1,
        last_reviewed: new Date().toISOString()
      };
      
      setFlashcards(updatedFlashcards);
      toast.success("Review saved");
      
      // Automatically go to next card if not the last one
      if (currentIndex < flashcards.length - 1) {
        setTimeout(() => {
          handleNext();
        }, 500);
      }
    } catch (error) {
      console.error("Error updating review status:", error);
      toast.error("Failed to save review");
    }
  };

  const handleExport = () => {
    if (!flashcards.length) return;
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Question,Answer,Difficulty,Tags\n" 
      + flashcards.map(card => {
          return `"${card.front_text.replace(/"/g, '""')}","${card.back_text.replace(/"/g, '""')}","${card.difficulty}","${card.tags.join(', ')}"`;
        }).join("\n");
        
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `flashcards-${flashcardSetId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Flashcards exported successfully");
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: setDetails?.title || "Flashcard Set",
        text: "Check out this flashcard set I created!",
        url: window.location.href,
      })
      .then(() => toast.success("Shared successfully"))
      .catch((error) => console.error("Error sharing:", error));
    } else {
      // Fallback: copy link to clipboard
      navigator.clipboard.writeText(window.location.href)
        .then(() => toast.success("Link copied to clipboard"))
        .catch(() => toast.error("Failed to copy link"));
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center flex-col">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <span className="text-lg">Loading flashcards...</span>
        <p className="text-sm text-gray-600 mt-2">Set ID: {flashcardSetId}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center flex-col">
        <div className="bg-red-50 text-red-800 p-4 rounded-lg max-w-lg">
          <h3 className="text-lg font-medium mb-2">Error</h3>
          <p>{error}</p>
          <p className="mt-4 text-sm">Flashcard Set ID: {flashcardSetId}</p>
          <Link href="/dashboard" className="mt-4 inline-block">
            <Button variant="outline" className="mt-2">
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!flashcards.length) {
    return (
      <div className="flex h-screen w-full items-center justify-center flex-col">
        <div className="text-center max-w-lg">
          <h3 className="text-xl font-medium mb-2">No Flashcards Found</h3>
          <p className="text-muted-foreground mb-6">This flashcard set is empty or has been deleted.</p>
          <Link href="/dashboard/create-flashcards">
            <Button>Create New Flashcards</Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentFlashcard = flashcards[currentIndex];

  return (
    <div ref={containerRef} className="container mx-auto py-8 px-4 max-w-4xl">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="mr-2">
                <ArrowLeft size={20} />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">{setDetails?.title || "Flashcard Set"}</h1>
          </div>
          
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExport} 
              className="flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="flex items-center"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-3">
          {setDetails?.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
        
        <div className="mt-3 text-sm text-muted-foreground">
          Created on {new Date(setDetails?.created_at || "").toLocaleDateString()} •
           <span> </span>
           {setDetails?.flashcard_count || flashcards.length} cards
        </div>
      </header>
      
      {/* Flashcard Display */}
      <div className="mb-8">
        <div 
          className="perspective-1000 text-center w-full aspect-[4/3] cursor-pointer"
          onClick={handleFlip}
        >
          <div 
            ref={cardRef}
            className="relative w-full h-full"
            style={{ 
              transformStyle: "preserve-3d",
              transition: "transform 0.6s"
            }}
          >
            {/* Front of card */}
            <Card 
              className="flashcard-front absolute w-full h-full p-6 flex items-center justify-center backface-hidden card-shine"
            >
              <div className="w-full">
                <div className="prose prose-lg max-w-none">
                  <p className="font-medium">{currentFlashcard.front_text}</p>
                </div>

                <div className="absolute bottom-4 right-4 text-sm text-muted-foreground">
                  Question
                </div>
                
                <div className="absolute top-4 left-4">
                  <Badge variant="outline" className="mr-2">
                    {currentFlashcard.difficulty}
                  </Badge>
                  
                  {currentFlashcard.tags.map((tag) => (
                    <Badge key={tag} className="mr-2">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="absolute top-4 right-4">
                  <Button variant="ghost" size="icon" onClick={(e) => {
                    e.stopPropagation(); // Prevent card flip
                    handleFlip();
                  }}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
            
            {/* Back of card */}
            <Card 
              className="flashcard-back absolute w-full h-full p-6 flex items-center justify-center backface-hidden card-shine"
            >
              <div className="w-full">
                <div className="prose prose-lg max-w-none">
                  <p className="font-medium">{currentFlashcard.back_text}</p>
                </div>

                <div className="absolute bottom-4 right-4 text-sm text-muted-foreground">
                  Answer
                </div>
                
                <div className="absolute top-4 left-4">
                  <Badge variant="outline" className="mr-2">
                    {currentFlashcard.difficulty}
                  </Badge>
                  
                  {currentFlashcard.tags.map((tag) => (
                    <Badge key={tag} className="mr-2">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="absolute top-4 right-4">
                  <Button variant="ghost" size="icon" onClick={(e) => {
                    e.stopPropagation(); // Prevent card flip
                    handleFlip();
                  }}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Navigation Controls */}
      <FlashcardNavigation
        currentIndex={currentIndex}
        totalCards={flashcards.length}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onFlip={handleFlip}
      />
      
      {/* Review Buttons */}
      {isFlipped && (
        <div className="mt-8">
          <h3 className="text-center mb-4 text-lg font-medium">How well did you know this?</h3>
          <div className="flex justify-between gap-2">
            <Button 
              variant="outline" 
              className="flex-1 border-red-200 hover:bg-red-50 hover:text-red-600"
              onClick={() => handleReviewFlashcard(1)}
            >
              Not at all
            </Button>
            <Button 
              variant="outline"
              className="flex-1 border-orange-200 hover:bg-orange-50 hover:text-orange-600"
              onClick={() => handleReviewFlashcard(2)}
            >
              Barely
            </Button>
            <Button 
              variant="outline"
              className="flex-1 border-yellow-200 hover:bg-yellow-50 hover:text-yellow-600"
              onClick={() => handleReviewFlashcard(3)}
            >
              Somewhat
            </Button>
            <Button 
              variant="outline"
              className="flex-1 border-green-200 hover:bg-green-50 hover:text-green-600"
              onClick={() => handleReviewFlashcard(4)}
            >
              Well
            </Button>
            <Button 
              variant="outline"
              className="flex-1 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600"
              onClick={() => handleReviewFlashcard(5)}
            >
              Perfectly
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedFlashcardsPage;