"use client";

import React, { useRef, useEffect } from 'react';
import { Document } from '@/lib/documents';
import { formatFileSize, formatDate } from '@/utils/documentUtils';
import FileIcon from './FileIcon';
import { gsap } from 'gsap';
import { MoreHorizontal, Download, Trash, Eye } from 'lucide-react';

interface DocumentListItemProps {
  document: Document;
  onClick: (document: Document) => void;
  onDownload: (document: Document) => void;
  onDelete: (id: number) => void;
  index: number;
}

const DocumentListItem: React.FC<DocumentListItemProps> = ({ 
  document, 
  onClick, 
  onDownload, 
  onDelete,
  index
}) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const [showActions, setShowActions] = React.useState(false);

  useEffect(() => {
    if (itemRef.current) {
      gsap.fromTo(
        itemRef.current,
        { 
          y: 20, 
          opacity: 0 
        },
        { 
          y: 0, 
          opacity: 1, 
          duration: 0.3, 
          delay: index * 0.05, 
          ease: 'power2.out' 
        }
      );
    }
  }, [index]);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDownload(document);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(document.id);
  };

  const fileExtension = document.fileExtension.toLowerCase();
  
  return (
    <div 
      ref={itemRef}
      className="bg-white border-b border-gray-100 hover:bg-gray-50 transition-colors p-3 cursor-pointer"
      onClick={() => onClick(document)}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      data-document-id={document.id}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center flex-1">
          <FileIcon fileType={fileExtension} size={24} />
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-gray-800 truncate" title={document.originalFileName}>
              {document.originalFileName}
            </h3>
          </div>
        </div>
        
        <div className="hidden sm:block w-32">
          <p className="text-xs text-gray-500">{formatFileSize(document.fileSize)}</p>
        </div>
        
        <div className="hidden md:block w-40">
          <p className="text-xs text-gray-500">{formatDate(document.uploadDateTime)}</p>
        </div>
        
        <div className="flex items-center space-x-2">
          {showActions ? (
            <>
              <button 
                className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick(document);
                }}
                title="View"
              >
                <Eye size={16} className="text-gray-600" />
              </button>
              <button 
                className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                onClick={handleDownload}
                title="Download"
              >
                <Download size={16} className="text-gray-600" />
              </button>
              <button 
                className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                onClick={handleDelete}
                title="Delete"
              >
                <Trash size={16} className="text-red-500" />
              </button>
            </>
          ) : (
            <button 
              className="p-1 rounded-full hover:bg-gray-200 transition-colors opacity-50"
              onClick={(e) => {
                e.stopPropagation();
                setShowActions(true);
              }}
            >
              <MoreHorizontal size={16} className="text-gray-500" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentListItem;