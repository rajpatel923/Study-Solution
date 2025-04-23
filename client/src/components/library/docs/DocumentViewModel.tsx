"use client";

import React, { useRef, useEffect, useState } from 'react';
import { Document } from '@/lib/documents';
import { formatFileSize, formatDate, parseMetadata } from '@/utils/documentUtils';
import FileIcon from './FileIcon';
import { gsap } from 'gsap';
import { X, Download, Edit, ExternalLink, Info } from 'lucide-react';

interface DocumentViewModalProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (document: Document) => void;
  onEdit: (document: Document) => void;
}

const DocumentViewModal: React.FC<DocumentViewModalProps> = ({
  document,
  isOpen,
  onClose,
  onDownload,
  onEdit
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<'preview' | 'properties'>('preview');
  const [isMounted, setIsMounted] = useState(false);

  // Set isMounted to true after the component mounts
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    // Safety check: Only manipulate DOM if component is mounted,
    // the modal is open, and we have a document
    if (!isMounted || !isOpen || !document) {
      return;
    }

    // Safe to access document.body since we've checked all conditions
    if (typeof window !== 'undefined' && window.document) {
      // document.body.style.overflow = 'hidden';
    }
    
    // Animate modal in
    if (overlayRef.current) {
      gsap.fromTo(
        overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.2 }
      );
    }
    
    if (modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { 
          scale: 0.95,
          opacity: 0 
        },
        { 
          scale: 1, 
          opacity: 1, 
          duration: 0.3, 
          ease: 'back.out(1.2)' 
        }
      );
    }
    
    // Stagger animate content
    if (contentRef.current) {
      const elements = contentRef.current.children;
      gsap.fromTo(
        elements,
        { 
          opacity: 0,
          y: 10
        },
        { 
          opacity: 1,
          y: 0,
          stagger: 0.05,
          duration: 0.3,
          delay: 0.2
        }
      );
    }

    // Cleanup function
    return () => {
      if (typeof window !== 'undefined' && window.document) {
        // document.body.style.overflow = 'auto';
      }
    };
  }, [isOpen, document, isMounted]);

  const handleClose = () => {
    // Safety check before animations
    if (!overlayRef.current || !modalRef.current) {
      onClose();
      return;
    }

    // Animate modal out
    gsap.to(
      overlayRef.current,
      { opacity: 0, duration: 0.2 }
    );
    
    gsap.to(
      modalRef.current,
      { 
        scale: 0.95, 
        opacity: 0, 
        duration: 0.3, 
        onComplete: onClose 
      }
    );
  };

  if (!isOpen || !document) return null;

  const metadata = parseMetadata(document.metadata);
  const fileExtension = document.fileExtension.toLowerCase();
  const isPdf = fileExtension === 'pdf';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension);

  return (
    <div 
      ref={overlayRef}
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center">
            <FileIcon fileType={fileExtension} size={24} />
            <h2 className="ml-2 text-lg font-semibold text-gray-800 truncate">
              {document.originalFileName}
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
              onClick={() => onDownload(document)}
              title="Download"
            >
              <Download size={20} />
            </button>
            <button 
              className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
              onClick={() => onEdit(document)}
              title="Edit properties"
            >
              <Edit size={20} />
            </button>
            <button 
              className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
              onClick={() => window.open(document.publicUrl, '_blank')}
              title="Open in new tab"
            >
              <ExternalLink size={20} />
            </button>
            <button 
              className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
              onClick={handleClose}
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div className="flex items-center border-b">
          <button 
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'preview' 
                ? 'border-indigo-500 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setTab('preview')}
          >
            Preview
          </button>
          <button 
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'properties' 
                ? 'border-indigo-500 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setTab('properties')}
          >
            Properties
          </button>
        </div>
        
        <div className="flex-1 overflow-auto">
          {tab === 'preview' && (
            <div className="h-full flex items-center justify-center p-4">
              {isPdf && (
                <iframe 
                  src={`${document.previewUrl}#toolbar=0`} 
                  className="w-full h-full border-0"
                  title={document.originalFileName}
                />
              )}
              
              {isImage && (
                <div className="max-h-full">
                  <img 
                    src={document.publicUrl} 
                    alt={document.originalFileName} 
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}
              
              {!isPdf && !isImage && (
                <div className="text-center">
                  <FileIcon fileType={fileExtension} size={64} className="mx-auto mb-4" />
                  <p className="text-gray-600">
                    Preview not available for this file type.
                  </p>
                  <button 
                    className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 transition-colors text-sm font-medium"
                    onClick={() => onDownload(document)}
                  >
                    Download to view
                  </button>
                </div>
              )}
            </div>
          )}
          
          {tab === 'properties' && (
            <div ref={contentRef} className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Info size={16} className="mr-2 text-gray-400" />
                  General Information
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">File Name</p>
                      <p className="text-sm text-gray-800">{document.originalFileName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">File Type</p>
                      <p className="text-sm text-gray-800">{document.contentType}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">File Size</p>
                      <p className="text-sm text-gray-800">{formatFileSize(document.fileSize)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Pages</p>
                      <p className="text-sm text-gray-800">{document.pageCount}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Upload Date</p>
                      <p className="text-sm text-gray-800">{formatDate(document.uploadDateTime)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Uploaded By</p>
                      <p className="text-sm text-gray-800">{document.userName}</p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-xs text-gray-500">File URL</p>
                    <p className="text-sm text-gray-800 truncate">
                      <a 
                        href={document.publicUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        {document.publicUrl}
                      </a>
                    </p>
                  </div>
                </div>
              </div>
              
              {metadata && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Info size={16} className="mr-2 text-gray-400" />
                    Document Metadata
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(metadata).map(([key, value]) => (
                        <div key={key}>
                          <p className="text-xs text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                          <p className="text-sm text-gray-800">
                            {typeof value === 'boolean' 
                              ? value ? 'Yes' : 'No'
                              : String(value || '-')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentViewModal;