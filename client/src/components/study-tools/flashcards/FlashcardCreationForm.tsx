"use client";

import React, { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import { useFlashcardContext, FlashcardWorkflowState } from "@/context/FlashcardContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Loader2 } from "lucide-react";
import flashcardService from "@/services/flashcardService";

export default function FlashcardCreationForm() {
  const {
    uploadedDocument,
    cardCount,
    setCardCount,
    difficultyLevel,
    setDifficultyLevel,
    customPrompt,
    setCustomPrompt,
    tags,
    setTags,
    focusAreas,
    setFocusAreas,
    setWorkflowState,
    setFlashcardSetId,
    setDocumentId,
    setSampleFlashcards,
    setError,
  } = useFlashcardContext();

  const formRef = useRef<HTMLDivElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTag, setCurrentTag] = useState("");
  const [currentFocusArea, setCurrentFocusArea] = useState("");

  useEffect(() => {
    // Animation when component mounts
    if (formRef.current) {
      gsap.fromTo(
        formRef.current,
        {
          opacity: 0,
          y: 20,
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: "power2.out",
        }
      );
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!uploadedDocument) {
      setError("No document uploaded. Please upload a document first.");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const flashcardData = {
        content_url: uploadedDocument.publicUrl || "",
        user_id: "5", // Replace with actual user ID from auth context
        difficulty_level: difficultyLevel,
        card_count: cardCount,
        tags: tags,
        focus_areas: focusAreas.length > 0 ? focusAreas : undefined,
      };
      
      // Perform slide-out animation
      if (formRef.current) {
        await gsap.to(formRef.current, {
          opacity: 0,
          x: -50,
          duration: 0.4,
          ease: "power2.in",
        });
      }
      
      setWorkflowState(FlashcardWorkflowState.GENERATING);
      
      const response = await flashcardService.createFlashcards(flashcardData);
      
      if (response.status === "success" && response.flashcard_set_id) {
        // Save the flashcard set ID and document ID to context
        console.log("Flashcard set created successfully:", response);
        setFlashcardSetId(response.flashcard_set_id);
        setDocumentId(response.document_id || null);
        
        if (response.sample_flashcards) {
          setSampleFlashcards(response.sample_flashcards);
        }
        
        // After successful creation, move to display state
        setTimeout(() => {
          setWorkflowState(FlashcardWorkflowState.DISPLAY);
        }, 1000);
      } else {
        setError(response.error_message || "Failed to create flashcards");
        setWorkflowState(FlashcardWorkflowState.ERROR);
      }
    } catch (error: any) {
      console.error("Error creating flashcards:", error);
      setError(error.message || "An error occurred while creating flashcards");
      setWorkflowState(FlashcardWorkflowState.ERROR);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags([...tags, currentTag.trim()]);
      setCurrentTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleAddFocusArea = () => {
    if (currentFocusArea.trim() && !focusAreas.includes(currentFocusArea.trim())) {
      setFocusAreas([...focusAreas, currentFocusArea.trim()]);
      setCurrentFocusArea("");
    }
  };

  const handleRemoveFocusArea = (areaToRemove: string) => {
    setFocusAreas(focusAreas.filter(area => area !== areaToRemove));
  };

  const handleCancel = () => {
    setWorkflowState(FlashcardWorkflowState.UPLOAD);
  };

  return (
    <div ref={formRef} className="w-full max-w-4xl mx-auto">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Create Flashcards</CardTitle>
          <p className="text-muted-foreground">
            Customize how you want your flashcards to be generated from{" "}
            <span className="font-medium">{uploadedDocument?.fileName}</span>
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Number of Flashcards */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="card-count">Number of Flashcards</Label>
                <span className="text-sm font-medium">{cardCount}</span>
              </div>
              <Slider
                id="card-count"
                min={5}
                max={50}
                step={1}
                value={[cardCount]}
                onValueChange={(value) => setCardCount(value[0])}
                className="py-4"
              />
              <p className="text-sm text-muted-foreground">
                Choose how many flashcards to generate (5-50)
              </p>
            </div>
            
            {/* Difficulty Level */}
            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty Level</Label>
              <Select
                value={difficultyLevel}
                onValueChange={setDifficultyLevel}
              >
                <SelectTrigger id="difficulty">
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Choose the difficulty level of the generated flashcards
              </p>
            </div>
            
            {/* Custom Prompt */}
            <div className="space-y-2">
              <Label htmlFor="custom-prompt">Custom Prompt (Optional)</Label>
              <Textarea
                id="custom-prompt"
                placeholder="E.g., Focus on key concepts and definitions only"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={3}
              />
              <p className="text-sm text-muted-foreground">
                Provide specific instructions for flashcard generation
              </p>
            </div>
            
            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  placeholder="Add a tag"
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddTag}
                >
                  Add
                </Button>
              </div>
              
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="px-3 py-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            
            {/* Focus Areas */}
            <div className="space-y-2">
              <Label htmlFor="focus-areas">Focus Areas (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="focus-areas"
                  placeholder="Add a focus area"
                  value={currentFocusArea}
                  onChange={(e) => setCurrentFocusArea(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddFocusArea();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddFocusArea}
                >
                  Add
                </Button>
              </div>
              
              {focusAreas.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {focusAreas.map((area) => (
                    <Badge key={area} variant="secondary" className="px-3 py-1">
                      {area}
                      <button
                        type="button"
                        onClick={() => handleRemoveFocusArea(area)}
                        className="ml-2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Specify particular topics or concepts to focus on
              </p>
            </div>
          </form>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Flashcards"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}