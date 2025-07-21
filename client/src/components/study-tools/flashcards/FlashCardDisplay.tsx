"use client";

import React, { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import { useFlashcardContext, FlashcardWorkflowState } from "@/context/FlashcardContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, ArrowLeft, Loader2, Save } from "lucide-react";
import flashcardService from "@/services/flashcardService";
import FlashcardNavigation from "./FlashcardNavigation";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function FlashcardDisplay() {
  const router = useRouter();
  const {
    flashcardSetId,
    flashcards,
    setFlashcards,
    sampleFlashcards,
    currentFlashcardIndex,
    setCurrentFlashcardIndex,
    isFlipped,
    setIsFlipped,
    setWorkflowState,
    setError,
    resetContext,
  } = useFlashcardContext();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const frontContentRef = useRef<HTMLDivElement>(null);
  const backContentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch all flashcards for the set
  useEffect(() => {
    const fetchFlashcards = async () => {
      if (!flashcardSetId) {
        if (sampleFlashcards.length > 0) {
          const sampleAsFullFlashcards = sampleFlashcards.map((sample, index) => ({
            id: `sample-${index}`,
            user_id: "user123",
            document_id: "sample",
            flashcard_set_id: "sample",
            front_text: sample.front,
            back_text: sample.back,
            difficulty: "medium",
            category: "general",
            tags: [],
            created_at: new Date().toISOString(),
            review_count: 0,
            confidence_level: 0,
            metadata: {},
            content_type: "sample"
          }));
          
          setFlashcards(sampleAsFullFlashcards);
          setIsLoading(false);
          return;
        }
        
        // If no sample flashcards either, show error
        setError("No flashcards available");
        setWorkflowState(FlashcardWorkflowState.ERROR);
        return;
      }
      
      try {
        const response = await flashcardService.getFlashcardsBySet(
          flashcardSetId,
        );
        
        if (response.status === "success" && response.flashcards) {
          console.log("Fetched flashcards:", response.flashcards);
          setFlashcards(response.flashcards);
        } else {
          setError(response.message || "Failed to fetch flashcards");
          setWorkflowState(FlashcardWorkflowState.ERROR);
        }
      } catch (error: any) {
        console.error("Error fetching flashcards:", error);
        setError(error.message || "An error occurred while fetching flashcards");
        setWorkflowState(FlashcardWorkflowState.ERROR);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchFlashcards();
  }, [flashcardSetId, sampleFlashcards, setError, setFlashcards, setWorkflowState]);

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
  const flipCard = () => {
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

  // Go to the next card with animation
  const goToNextCard = () => {
    if (currentFlashcardIndex < flashcards.length - 1) {
      if (isFlipped) {
        // If the card is flipped, first unflip it
        flipCard();
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
              setCurrentFlashcardIndex(currentFlashcardIndex + 1);
              
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

  // Go to the previous card with animation
  const goToPrevCard = () => {
    if (currentFlashcardIndex > 0) {
      if (isFlipped) {
        // If the card is flipped, first unflip it
        flipCard();
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
              setCurrentFlashcardIndex(currentFlashcardIndex - 1);
              
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

  // Return to the upload workflow state
  const handleBackToUpload = () => {
    // Slide out animation
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        opacity: 0,
        y: 20,
        duration: 0.4,
        ease: "power2.in",
        onComplete: () => {
          resetContext();
        }
      });
    } else {
      resetContext();
    }
  };

  // Save flashcards and redirect to the saved page
  const handleSaveAndContinue = async () => {
    if (!flashcardSetId || flashcardSetId === 'sample') {
      toast.error("Cannot save sample flashcards");
      return;
    }
    
    try {
      setIsSaving(true);
      
      // You can add an API call here if needed to finalize the flashcard set
      // For now, we'll just navigate to the saved flashcards page
      
      // Simulate a delay to show the saving state
      setTimeout(() => {
        setIsSaving(false);
        toast.success("Flashcards saved successfully");
        
        // Navigate to the saved flashcards page
        router.push(`/dashboard/save-flashcards/${flashcardSetId}`);
      }, 1000);
      
    } catch (error) {
      console.error("Error saving flashcards:", error);
      setIsSaving(false);
      toast.error("Failed to save flashcards");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg font-medium">Loading flashcards...</p>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-lg font-medium mb-4">No flashcards available</p>
        <Button onClick={handleBackToUpload}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Upload Another Document
        </Button>
      </div>
    );
  }

  const currentFlashcard = flashcards[currentFlashcardIndex];

  return (
    <div ref={containerRef} className="w-full max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <Button variant="outline" onClick={handleBackToUpload}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        
        <div className="text-center">
          <h2 className="text-xl font-bold">Flashcards</h2>
          <p className="text-sm text-muted-foreground">
            Preview your flashcards before saving
          </p>
        </div>
        
        <Button 
          onClick={handleSaveAndContinue} 
          disabled={isSaving}
          className="flex items-center"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save & Continue
            </>
          )}
        </Button>
      </div>

      {/* Flashcard */}
      <div 
        className="perspective-1000 text-center w-full aspect-[4/3] mb-8 cursor-pointer"
        onClick={flipCard}
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
            className="flashcard-front absolute w-full h-full p-6 flex items-center justify-center backface-hidden"
          >
            <div 
              ref={frontContentRef}
              className="w-full"
            >
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
                  flipCard();
                }}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
          
          {/* Back of card */}
          <Card 
            className="flashcard-back absolute w-full h-full p-6 flex items-center justify-center backface-hidden"
          >
            <div 
              ref={backContentRef}
              className="w-full"
            >
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
                  flipCard();
                }}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Navigation Controls */}
      <FlashcardNavigation
        currentIndex={currentFlashcardIndex}
        totalCards={flashcards.length}
        onPrevious={goToPrevCard}
        onNext={goToNextCard}
        onFlip={flipCard}
      />
      
      {/* Info Message */}
      <div className="mt-8 p-4 bg-primary/5 rounded-lg border border-primary/10">
        <p className="text-sm text-center text-muted-foreground">
          Preview your flashcards above. When you're ready, click "Save & Continue" to access your flashcards later.
        </p>
      </div>
    </div>
  );
}