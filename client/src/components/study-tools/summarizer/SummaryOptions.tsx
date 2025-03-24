"use client";

import React, { useState, useRef, useEffect } from "react";
import { gsap } from "gsap";
import { FileText, Image, Video, FileAudio, FileSpreadsheet, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import UploadWorkflow from "./UploadWorkflow";

const TABS = [
  { id: "pdf", label: "AI PDF Summarizer", icon: <FileText className="mr-2 h-4 w-4" /> },
  { id: "ppt", label: "AI PPT Summarizer", icon: <Image className="mr-2 h-4 w-4" /> },
  { id: "video", label: "AI Video Summarizer", icon: <Video className="mr-2 h-4 w-4" /> },
  { id: "lecture", label: "AI Lecture Note Taker", icon: <FileAudio className="mr-2 h-4 w-4" /> },
  { id: "excel", label: "AI Excel Summarizer", icon: <FileSpreadsheet className="mr-2 h-4 w-4" /> }
];

export default function SummaryOptions() {
  const [activeTab, setActiveTab] = useState("pdf");
  const [isFavorite, setIsFavorite] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (tabsRef.current && !hasAnimated.current) {
      // Animation for tab buttons
      gsap.from(tabsRef.current.children, {
        opacity: 0,
        y: -10,
        stagger: 0.1,
        duration: 0.4,
        ease: "power2.out",
        onComplete: () => {
          hasAnimated.current = true;
        },
      });
    }

    // Card entrance animation
    if (cardRef.current) {
      gsap.from(cardRef.current, {
        opacity: 0,
        y: 20,
        duration: 0.5,
        delay: 0.3,
        ease: "power2.out",
      });
    }
  }, []);

  const handleTabClick = (tabId: string) => {
    // Don't re-animate if clicking the same tab
    if (tabId === activeTab) return;
    
    setActiveTab(tabId);
    
    // Subtle pulse animation on tab change
    if (cardRef.current) {
      gsap.fromTo(cardRef.current, 
        { scale: 0.98, opacity: 0.9 }, 
        { scale: 1, opacity: 1, duration: 0.3, ease: "power1.out" }
      );
    }
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    
    // Star animation
    const star = document.querySelector('.favorite-icon');
    if (star) {
      gsap.fromTo(star, 
        { scale: 0.5, rotate: -15 }, 
        { scale: 1.2, rotate: 15, duration: 0.3, yoyo: true, repeat: 1, ease: "back.out" }
      );
    }
  };

  const getCardTitle = () => {
    const tab = TABS.find(tab => tab.id === activeTab);
    return tab ? tab.label : "AI Document Summarizer";
  };

  return (
    <div className="w-full flex flex-col">
      {/* Tab Buttons */}
      <div ref={tabsRef} className="flex items-center justify-center gap-2 md:gap-4 mb-6 flex-wrap">
        {TABS.map((tab) => (
          <Button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            variant={activeTab === tab.id ? "default" : "secondary"}
            className={`rounded-full ${
              activeTab === tab.id
                ? ""
                : "hover:bg-secondary/80"
            }`}
          >
            {tab.icon}
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Card Section */}
      <Card ref={cardRef} className="border shadow-md">
        <CardContent className="p-6">
          {/* Title Bar with Favorite Button */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-foreground">{getCardTitle()}</h2>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={toggleFavorite} 
              className="p-2 rounded-full hover:bg-primary/10 transition-colors duration-200"
            >
              <Star className={`favorite-icon h-5 w-5 ${isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
              <span className="sr-only">{isFavorite ? "Remove from favorites" : "Add to favorites"}</span>
            </Button>
          </div>
          
          {/* Description */}
          <div className="mb-6">
            <p className="text-foreground/80">
              Upload any {activeTab.toUpperCase()} & Kai will make notes & flashcards instantly.
            </p>
            <p className="text-muted-foreground text-sm">
              In &lt; 30 seconds Kai will read your document and tell you all the important stuff in it.
            </p>
          </div>

          {/* Upload Workflow Integration */}
          <UploadWorkflow />
        </CardContent>
      </Card>
    </div>
  );
}