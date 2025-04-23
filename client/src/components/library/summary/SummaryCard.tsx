"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import { getLengthBadgeColor, getSummaryPreview } from "@/utils/summaryUtils";
import { Summary } from "@/lib/summary";

interface SummaryCardProps {
  summary: Summary;
  onClick: () => void;
  onDelete: () => void;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ summary, onClick, onDelete }) => {
  const [showOptions, setShowOptions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Format date to "time ago" format
  const timeAgo = formatDistanceToNow(new Date(summary.last_updated || summary.created_at), {
    addSuffix: true,
  });

  // Get icon based on content type
  const getContentTypeIcon = (contentType: string) => {
    switch (contentType) {
      case "pdf":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V8.342a2 2 0 00-.602-1.43l-4.44-4.342A2 2 0 0010.56 2H4zm9 4a1 1 0 00-1-1H6a1 1 0 00-1 1v8a1 1 0 001 1h6a1 1 0 001-1V8z" clipRule="evenodd" />
          </svg>
        );
      case "webpage":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd" />
          </svg>
        );
      case "youtube":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const handleOptionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowOptions(!showOptions);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowOptions(false);
    setShowDeleteConfirm(true);
  };

  const handleCloseModal = () => {
    setShowDeleteConfirm(false);
  };

  const handleConfirmDelete = () => {
    onDelete();
  };

  return (
    <>
      <div className="summary-card bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden border border-gray-200">
        <div 
          className="p-5 cursor-pointer"
          onClick={onClick}
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center">
              {getContentTypeIcon(summary.content_type)}
              <span className="ml-2 text-sm text-gray-600">{summary.content_type.toUpperCase()}</span>
            </div>
            
            <div className="relative">
              <button 
                onClick={handleOptionClick}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
              
              {showOptions && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                  <ul>
                    <li>
                      <button
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        onClick={handleDeleteClick}
                      >
                        Delete Summary
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
          
          <h3 className="font-medium text-lg text-gray-900 mb-2 line-clamp-2">
            {summary.prompt_used || "Summary"}
          </h3>
          
          <p className="text-gray-600 text-sm mb-4 line-clamp-3">
            {getSummaryPreview(summary.text)}
          </p>
          
          <div className="flex justify-between items-center mt-4">
            <div className="flex items-center">
              <span className={`inline-block px-2 py-1 text-xs rounded-full ${getLengthBadgeColor(summary.length)}`}>
                {summary.length}
              </span>
              <span className="ml-2 text-xs text-gray-500">{summary.word_count} words</span>
            </div>
            <span className="text-xs text-gray-500">{timeAgo}</span>
          </div>
        </div>
      </div>
      
      {/* Delete confirmation modal */}
      <ConfirmDeleteModal 
        isOpen={showDeleteConfirm}
        onClose={handleCloseModal}
        onConfirm={handleConfirmDelete}
        summaryTitle={summary.prompt_used || "Summary"}
      />
    </>
  );
};

export default SummaryCard;