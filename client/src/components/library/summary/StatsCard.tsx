"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { Summary } from "@/lib/summary";

interface StatsCardProps {
  summaries: Summary[];
}

const StatsCard: React.FC<StatsCardProps> = ({ summaries }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", delay: 0.2 }
      );
    }
  }, []);

  // Calculate stats
  const totalSummaries = summaries.length;
  const totalWords = summaries.reduce((sum, summary) => sum + summary.word_count, 0);
  
  // Get most common content type
  const contentTypeCounts: Record<string, number> = {};
  summaries.forEach(summary => {
    const type = summary.content_type.toLowerCase();
    contentTypeCounts[type] = (contentTypeCounts[type] || 0) + 1;
  });
  
  let mostCommonContentType = "None";
  let maxCount = 0;
  
  Object.entries(contentTypeCounts).forEach(([type, count]) => {
    if (count > maxCount) {
      mostCommonContentType = type;
      maxCount = count;
    }
  });

  // Get most recent summary date
  let mostRecentDate = "None";
  if (totalSummaries > 0) {
    const dates = summaries.map(summary => 
      new Date(summary.last_updated || summary.created_at)
    );
    const mostRecent = new Date(Math.max(...dates.map(date => date.getTime())));
    mostRecentDate = mostRecent.toLocaleDateString();
  }

  return (
    <div 
      ref={cardRef}
      className="bg-white rounded-lg shadow-md p-5 mb-6"
    >
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Summary Statistics</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-700">Total Summaries</p>
          <p className="text-2xl font-bold text-blue-800">{totalSummaries}</p>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-green-700">Total Words</p>
          <p className="text-2xl font-bold text-green-800">
            {totalWords > 1000 ? `${(totalWords / 1000).toFixed(1)}k` : totalWords}
          </p>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-sm text-purple-700">Most Common Type</p>
          <p className="text-2xl font-bold text-purple-800 capitalize">{mostCommonContentType}</p>
        </div>
        
        <div className="bg-yellow-50 p-4 rounded-lg">
          <p className="text-sm text-yellow-700">Last Updated</p>
          <p className="text-2xl font-bold text-yellow-800">{mostRecentDate}</p>
        </div>
      </div>
    </div>
  );
};

export default StatsCard;