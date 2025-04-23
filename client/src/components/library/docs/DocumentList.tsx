"use client";

import React, { useRef, useEffect } from 'react';
import { Document } from '@/lib/documents';
import DocumentListItem from './DocumentListItem';
import { gsap } from 'gsap';

interface DocumentListProps {
  documents: Document[];
  onDocumentClick: (document: Document) => void;
  onDownload: (document: Document) => void;
  onDelete: (id: number) => void;
}

const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  onDocumentClick,
  onDownload,
  onDelete
}) => {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      gsap.fromTo(
        listRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5, ease: 'power2.out' }
      );
    }
  }, []);

  return (
    <div ref={listRef} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="grid grid-cols-1 divide-y divide-gray-100">
        <div className="bg-gray-50 px-3 py-2">
          <div className="flex items-center font-medium text-xs text-gray-500 uppercase">
            <div className="flex-1">Name</div>
            <div className="w-32 hidden sm:block">Size</div>
            <div className="w-40 hidden md:block">Date Modified</div>
            <div className="w-20">Actions</div>
          </div>
        </div>
        
        {documents.map((doc, index) => (
          <DocumentListItem
            key={doc.id}
            document={doc}
            onClick={onDocumentClick}
            onDownload={onDownload}
            onDelete={onDelete}
            index={index}
          />
        ))}
      </div>
    </div>
  );
};

export default DocumentList;