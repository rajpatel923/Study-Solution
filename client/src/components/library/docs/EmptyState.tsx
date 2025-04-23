// components/EmptyState.tsx
import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { FileUp, FolderPlus } from 'lucide-react';

interface EmptyStateProps {
  onUpload: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onUpload }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && iconRef.current) {
      // Fade in animation
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }
      );
      
      // Floating animation for the icon
      gsap.to(
        iconRef.current,
        { 
          y: -10, 
          duration: 1.5, 
          repeat: -1, 
          yoyo: true, 
          ease: 'power1.inOut' 
        }
      );
    }
  }, []);

  return (
    <div 
      ref={containerRef}
      className="flex flex-col items-center justify-center bg-white py-16 px-6 rounded-lg border-2 border-dashed border-gray-200"
    >
      <div
        ref={iconRef}
        className="bg-indigo-50 p-6 rounded-full mb-6"
      >
        <FileUp className="h-12 w-12 text-indigo-400" />
      </div>
      
      <h3 className="text-xl font-semibold text-gray-800 mb-2">No documents yet</h3>
      <p className="text-gray-500 text-center max-w-md mb-6">
        Upload your first document to get started. You can upload files like PDFs, images, and more.
      </p>
      
      <button
        className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        onClick={onUpload}
      >
        <FolderPlus className="h-5 w-5 mr-2" />
        Upload Document
      </button>
    </div>
  );
};

export default EmptyState;

