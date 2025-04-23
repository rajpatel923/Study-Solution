"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Filter, 
  ChevronDown, 
  Check,
  Search
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FlashcardFiltersProps {
  filters: {
    difficulty: string;
    contentType: string;
    tag: string;
  };
  onChange: (filters: any) => void;
  className?: string;
}

export default function FlashcardFilters({ 
  filters, 
  onChange, 
  className 
}: FlashcardFiltersProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Implementation for search could be added here
    // Currently search functionality is not fully implemented
  };

  const handleDifficultyChange = (value: string) => {
    onChange({ difficulty: value });
  };

  const handleContentTypeChange = (value: string) => {
    onChange({ contentType: value });
  };

  const handleTagChange = (value: string) => {
    onChange({ tag: value });
  };

  const handleReset = () => {
    onChange({
      difficulty: "",
      contentType: "",
      tag: ""
    });
    setSearchTerm("");
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={cn("bg-white rounded-lg shadow-sm border p-4", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium flex items-center">
          <Filter className="h-5 w-5 mr-2" />
          Filters
        </h3>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={toggleExpanded}
          className="text-gray-500"
        >
          <span className="mr-1">
            {isExpanded ? 'Hide Filters' : 'Show Filters'}
          </span>
          <ChevronDown 
            className={`h-4 w-4 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`} 
          />
        </Button>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2 mb-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search flashcards..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      {/* Expanded Filters */}
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2"
        >
          {/* Difficulty Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Difficulty
            </label>
            <Select
              value={filters.difficulty}
              onValueChange={handleDifficultyChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Difficulties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Difficulties</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Content Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content Type
            </label>
            <Select
              value={filters.contentType}
              onValueChange={handleContentTypeChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="text">Text</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category/Tag Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <Select
              value={filters.tag}
              onValueChange={handleTagChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Software Testing">Software Testing</SelectItem>
                <SelectItem value="User Interface">User Interface</SelectItem>
                <SelectItem value="Inventory Management">Inventory Management</SelectItem>
                <SelectItem value="Data Persistence">Data Persistence</SelectItem>
                <SelectItem value="Alternate Scenarios">Alternate Scenarios</SelectItem>
                <SelectItem value="Use Case">Use Case</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-3 flex justify-end mt-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleReset}
              className="text-gray-500"
            >
              Reset Filters
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}