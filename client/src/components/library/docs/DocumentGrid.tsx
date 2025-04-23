"use client";

import React, { useRef, useEffect } from 'react';
import { Document } from '@/lib/documents';
import DocumentCard from './DocumentCard';
import { gsap } from 'gsap';

interface DocumentGridProps {
  documents: Document[];
  onDocumentClick: (document: Document) => void;
  onDownload: (document: Document) => void;
  onDelete: (id: number) => void;
}

const DocumentGrid: React.FC<DocumentGridProps> = ({
  documents,
  onDocumentClick,
  onDownload,
  onDelete
}) => {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (gridRef.current) {
      gsap.fromTo(
        gridRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5, ease: 'power2.out' }
      );
    }
  }, []);

  return (
    <div
      ref={gridRef}
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 "
    >
      {documents.map((doc) => (
        <DocumentCard
          key={doc.id}
          document={doc}
          onClick={onDocumentClick}
          onDownload={onDownload}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

export default DocumentGrid;