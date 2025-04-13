"use client";

import React from "react";
import { gsap } from "gsap";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  ArrowLeftRight
} from "lucide-react";

interface FlashcardNavigationProps {
  currentIndex: number;
  totalCards: number;
  onPrevious: () => void;
  onNext: () => void;
  onFlip: () => void;
}

export default function FlashcardNavigation({
  currentIndex,
  totalCards,
  onPrevious,
  onNext,
  onFlip
}: FlashcardNavigationProps) {
  // Animation for button press
  const animateButtonPress = (element: HTMLElement) => {
    gsap.fromTo(
      element,
      { scale: 1 },
      { 
        scale: 0.95, 
        duration: 0.1, 
        yoyo: true, 
        repeat: 1,
        ease: "power2.inOut" 
      }
    );
  };

  const handlePrevious = (e: React.MouseEvent<HTMLButtonElement>) => {
    animateButtonPress(e.currentTarget);
    onPrevious();
  };

  const handleNext = (e: React.MouseEvent<HTMLButtonElement>) => {
    animateButtonPress(e.currentTarget);
    onNext();
  };

  const handleFlip = (e: React.MouseEvent<HTMLButtonElement>) => {
    animateButtonPress(e.currentTarget);
    onFlip();
  };

  // Calculate progress
  const progress = ((currentIndex + 1) / totalCards) * 100;

  return (
    <div className="flex flex-col gap-4">
      {/* Progress Bar */}
      <div className="w-full bg-muted rounded-full h-2.5 mb-2">
        <div 
          className="bg-primary h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      
      {/* Navigation Buttons */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          size="lg"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="px-4"
        >
          <ChevronLeft className="h-5 w-5 mr-2" />
          Previous
        </Button>
        
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={handleFlip}
            className="h-12 w-12"
          >
            <ArrowLeftRight className="h-5 w-5" />
          </Button>
        </div>
        
        <Button
          variant="outline"
          size="lg"
          onClick={handleNext}
          disabled={currentIndex === totalCards - 1}
          className="px-4"
        >
          Next
          <ChevronRight className="h-5 w-5 ml-2" />
        </Button>
      </div>

      {/* Card Counter */}
      <div className="text-center text-sm text-muted-foreground">
        {currentIndex + 1} of {totalCards} flashcards
      </div>
    </div>
  );
}