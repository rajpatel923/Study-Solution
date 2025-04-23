"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import SummaryCard from "./SummaryCard";

interface Summary {
  _id: string;
  user_id: string;
  document_id: string;
  text: string;
  type: string;
  prompt_used: string;
  length: "short" | "medium" | "long";
  created_at: string;
  word_count: number;
  content_type: string;
  last_updated?: string;
}

interface SummaryGridProps {
  summaries: Summary[];
  onSummaryClick: (summaryId: string) => void;
  onDeleteSummary: (summaryId: string) => void;
}

const SummaryGrid: React.FC<SummaryGridProps> = ({
  summaries,
  onSummaryClick,
  onDeleteSummary
}) => {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (gridRef.current) {
      const cards = gridRef.current.querySelectorAll(".summary-card");
      
      gsap.fromTo(
        cards,
        { 
          opacity: 0, 
          y: 30 
        },
        { 
          opacity: 1, 
          y: 0, 
          stagger: 0.1,
          duration: 0.5, 
          ease: "power2.out",
          delay: 0.3
        }
      );
    }
  }, [summaries]);

  return (
    <div 
      ref={gridRef}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {summaries.map((summary) => (
        <SummaryCard
          key={summary._id}
          summary={summary}
          onClick={() => onSummaryClick(summary._id)}
          onDelete={() => onDeleteSummary(summary._id)}
        />
      ))}
    </div>
  );
};

export default SummaryGrid;