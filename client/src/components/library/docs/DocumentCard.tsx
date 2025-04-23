"use client";

import React, { useRef, useEffect } from 'react';
import { Document } from '@/lib/documents';
import { formatFileSize, formatDate } from '@/utils/documentUtils';
import FileIcon from './FileIcon';
import { gsap } from 'gsap';
import { MoreVertical, Download, Trash } from 'lucide-react';

interface DocumentCardProps {
  document: Document;
  onClick: (document: Document) => void;
  onDownload: (document: Document) => void;
  onDelete: (id: number) => void;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ 
  document, 
  onClick, 
  onDownload, 
  onDelete 
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [showMenu, setShowMenu] = React.useState(false);

  useEffect(() => {
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }
      );
    }
  }, []);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDownload(document);
    setShowMenu(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(document.id);
    setShowMenu(false);
  };

  const fileExtension = document.fileExtension.toLowerCase();
  
  return (
    <div 
      ref={cardRef}
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-4 cursor-pointer relative"
      onClick={() => onClick(document)}
      data-document-id={document.id}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <FileIcon fileType={fileExtension} size={32} />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-gray-800 truncate max-w-[150px]" title={document.originalFileName}>
              {document.originalFileName}
            </h3>
            <p className="text-xs text-gray-500">{formatFileSize(document.fileSize)}</p>
          </div>
        </div>
        <div className="relative">
          <button 
            className="p-1 rounded-full hover:bg-gray-100"
            onClick={handleMenuClick}
          >
            <MoreVertical size={16} className="text-gray-500" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg z-10 py-1">
              <button 
                className="flex items-center w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                onClick={handleDownload}
              >
                <Download size={16} className="mr-2" />
                Download
              </button>
              <button 
                className="flex items-center w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
                onClick={handleDelete}
              >
                <Trash size={16} className="mr-2" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="border-t border-gray-100 pt-2 mt-2">
        <p className="text-xs text-gray-500">
          Uploaded on {formatDate(document.uploadDateTime)}
        </p>
      </div>
    </div>
  );
};

export default DocumentCard;