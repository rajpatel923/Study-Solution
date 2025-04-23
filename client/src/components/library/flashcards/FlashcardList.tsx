"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { 
  BookOpen, 
  FileText,
  MoreVertical,
  Edit,
  Trash2,
  Share2,
  Folder,
  Calendar
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface FlashcardSet {
  _id: string;
  id?: string;
  user_id: string;
  document_id: string;
  title: string;
  description?: string;
  flashcard_count: number;
  created_at: string;
  tags: string[];
  content_type: string;
}

interface FlashcardSetListProps {
  flashcardSets: FlashcardSet[];
  onSetClick: (setId: string) => void;
  onDeleteSet?: (setId: string) => void;
  onEditSet?: (setId: string) => void;
}

export default function FlashcardSetList({ 
  flashcardSets, 
  onSetClick,
  onDeleteSet,
  onEditSet
}: FlashcardSetListProps) {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getContentTypeIcon = (contentType: string) => {
    switch (contentType.toLowerCase()) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-600" />;
      case 'video':
        return <FileText className="h-5 w-5 text-blue-600" />;
      case 'audio':
        return <FileText className="h-5 w-5 text-purple-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {flashcardSets.map((set) => (
        <motion.div
          key={set._id || set.id}
          variants={item}
          onClick={() => onSetClick(set._id || set.id || '')}
          className="bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow p-5 cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <div className="flex items-center">
              <div className="bg-blue-100 p-2 rounded-md mr-3">
                <Folder className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 line-clamp-1">{set.title}</h3>
                <p className="text-sm text-gray-500 line-clamp-1">{set.description || 'No description'}</p>
              </div>
            </div>
            
            <div onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100">
                  <MoreVertical className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEditSet && (
                    <DropdownMenuItem 
                      className="cursor-pointer"
                      onClick={() => onEditSet(set._id || set.id || '')}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem className="cursor-pointer">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                  {onDeleteSet && (
                    <DropdownMenuItem 
                      className="cursor-pointer text-red-600"
                      onClick={() => onDeleteSet(set._id || set.id || '')}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center">
              <BookOpen className="h-4 w-4 text-gray-400 mr-1" />
              <span className="text-sm text-gray-600">{set.flashcard_count} cards</span>
            </div>
            
            <div className="flex items-center">
              <Calendar className="h-4 w-4 text-gray-400 mr-1" />
              <span className="text-sm text-gray-600">{formatDate(set.created_at)}</span>
            </div>
          </div>
          
          {set.tags && set.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {set.tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs bg-gray-50">
                  {tag}
                </Badge>
              ))}
              {set.tags.length > 3 && (
                <Badge variant="outline" className="text-xs bg-gray-50">
                  +{set.tags.length - 3} more
                </Badge>
              )}
            </div>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
}