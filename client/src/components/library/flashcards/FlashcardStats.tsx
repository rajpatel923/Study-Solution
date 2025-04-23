"use client";

import { motion } from "framer-motion";
import { 
  BookOpen,  
  BarChart2, 
  FileText,
  CheckCircle,
  
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Flashcard } from "@/services/flashcardService";

interface FlashcardStatsProps {
  flashcards: Flashcard[];
  className?: string;
}

export default function FlashcardStats({ 
  flashcards, 
  className 
}: FlashcardStatsProps) {
  // Calculate statistics
  const totalFlashcards = flashcards.length;
  
  const reviewedFlashcards = flashcards.filter(card => 
    card.review_count > 0
  ).length;
  
  const totalReviews = flashcards.reduce(
    (total, card) => total + (card.review_count || 0), 
    0
  );
  
  const averageConfidenceLevel = flashcards.length > 0 
    ? flashcards.reduce(
        (total, card) => total + (card.confidence_level || 0), 
        0
      ) / totalFlashcards
    : 0;
  
  const difficultyBreakdown = {
    easy: flashcards.filter(card => card.difficulty === 'easy').length,
    medium: flashcards.filter(card => card.difficulty === 'medium').length,
    hard: flashcards.filter(card => card.difficulty === 'hard').length,
  };
  
  // Calculate percentages
  const reviewedPercentage = totalFlashcards > 0 
    ? (reviewedFlashcards / totalFlashcards) * 100 
    : 0;
  
  const formatNumber = (num: number) => {
    return Number.isInteger(num) ? num : num.toFixed(1);
  };
  
  // Get the newest flashcard created date
  const newestFlashcard = flashcards.length > 0 
    ? flashcards.reduce((newest, card) => {
        const cardDate = new Date(card.created_at);
        const newestDate = new Date(newest.created_at);
        return cardDate > newestDate ? card : newest;
      }, flashcards[0])
    : null;
  
  const newestFlashcardDate = newestFlashcard 
    ? new Date(newestFlashcard.created_at).toLocaleDateString('en-US', {
        year: 'numeric', 
        month: 'short', 
        day: 'numeric'
      })
    : 'N/A';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8", className)}
    >
      {/* Total Flashcards */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
        <div className="flex items-center mb-2">
          <div className="bg-blue-100 p-2 rounded-md mr-3">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">Total Flashcards</h3>
        </div>
        <p className="text-3xl font-bold text-gray-900 mt-2">{totalFlashcards}</p>
        <p className="text-sm text-gray-500 mt-1">
          Last added: {newestFlashcardDate}
        </p>
      </div>
      
      {/* Review Progress */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
        <div className="flex items-center mb-2">
          <div className="bg-green-100 p-2 rounded-md mr-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">Review Progress</h3>
        </div>
        <p className="text-3xl font-bold text-gray-900 mt-2">
          {reviewedFlashcards} / {totalFlashcards}
        </p>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
          <div 
            className="bg-green-500 h-2.5 rounded-full" 
            style={{ width: `${reviewedPercentage}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {reviewedPercentage.toFixed(0)}% reviewed
        </p>
      </div>
      
      {/* Average Confidence */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
        <div className="flex items-center mb-2">
          <div className="bg-purple-100 p-2 rounded-md mr-3">
            <BarChart2 className="h-5 w-5 text-purple-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">Avg. Confidence</h3>
        </div>
        <p className="text-3xl font-bold text-gray-900 mt-2">
          {formatNumber(averageConfidenceLevel)} / 3
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Based on {totalReviews} total reviews
        </p>
      </div>
      
      {/* Difficulty Breakdown */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
        <div className="flex items-center mb-2">
          <div className="bg-orange-100 p-2 rounded-md mr-3">
            <BookOpen className="h-5 w-5 text-orange-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">Difficulty Levels</h3>
        </div>
        <div className="mt-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-gray-700">Easy</span>
            <span className="text-sm font-medium text-gray-900">{difficultyBreakdown.easy}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full" 
              style={{ width: `${(difficultyBreakdown.easy / totalFlashcards) * 100}%` }}
            ></div>
          </div>
        </div>
        <div className="mt-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-gray-700">Medium</span>
            <span className="text-sm font-medium text-gray-900">{difficultyBreakdown.medium}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-yellow-500 h-2 rounded-full" 
              style={{ width: `${(difficultyBreakdown.medium / totalFlashcards) * 100}%` }}
            ></div>
          </div>
        </div>
        <div className="mt-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-gray-700">Hard</span>
            <span className="text-sm font-medium text-gray-900">{difficultyBreakdown.hard}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-red-500 h-2 rounded-full" 
              style={{ width: `${(difficultyBreakdown.hard / totalFlashcards) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}