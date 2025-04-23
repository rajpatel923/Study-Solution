"use client";

import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Link, File } from 'lucide-react';
import { gsap } from 'gsap';
import { formatFileSize } from '@/utils/documentUtils';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: File[], metadata?: any) => Promise<void>;
}

const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUpload }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [linkInput, setLinkInput] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      
      // Animate modal in
      gsap.fromTo(
        overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.2 }
      );
      
      gsap.fromTo(
        modalRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.3, ease: 'back.out(1.2)' }
      );
      
      // Pulse animation for dropzone
      gsap.fromTo(
        dropzoneRef.current,
        { boxShadow: '0 0 0 0px rgba(99, 102, 241, 0.4)' },
        { 
          boxShadow: '0 0 0 4px rgba(99, 102, 241, 0.1)', 
          repeat: -1, 
          duration: 1.5,
          ease: 'power2.inOut',
          yoyo: true
        }
      );
    } else {
      document.body.style.overflow = 'auto';
      setFiles([]);
      setLinkInput('');
      setUploadProgress(0);
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  const handleClose = () => {
    if (uploading) return;
    
    // Animate modal out
    gsap.to(
      overlayRef.current,
      { opacity: 0, duration: 0.2 }
    );
    
    gsap.to(
      modalRef.current,
      { 
        y: 20, 
        opacity: 0, 
        duration: 0.3, 
        onComplete: onClose 
      }
    );
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    gsap.to(dropzoneRef.current, { 
      backgroundColor: 'rgba(99, 102, 241, 0.1)', 
      borderColor: '#6366f1',
      duration: 0.2 
    });
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    gsap.to(dropzoneRef.current, { 
      backgroundColor: 'transparent', 
      borderColor: '#e5e7eb',
      duration: 0.2 
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    gsap.to(dropzoneRef.current, { 
      backgroundColor: 'transparent', 
      borderColor: '#e5e7eb',
      duration: 0.2 
    });
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    
    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 300);
    
    try {
      await onUpload(files);
      
      // Complete progress
      setUploadProgress(100);
      
      // Reset and close after a small delay
      setTimeout(() => {
        setFiles([]);
        setUploading(false);
        setUploadProgress(0);
        handleClose();
      }, 500);
      
    } catch (error) {
      console.error('Upload error:', error);
      setUploading(false);
      setUploadProgress(0);
    } finally {
      clearInterval(progressInterval);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={overlayRef}
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Upload Files</h2>
          <button 
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
            onClick={handleClose}
            disabled={uploading}
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto">
          <div 
            ref={dropzoneRef}
            className="border-2 border-dashed border-gray-200 rounded-lg p-6 mb-4 flex flex-col items-center justify-center transition-colors"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              onChange={handleFileSelect}
            />
            <Upload className="text-indigo-500 mb-2" size={32} />
            <p className="text-sm text-gray-600 text-center">
              Drag & drop files here or click to browse
            </p>
            <p className="text-xs text-gray-500 mt-1 text-center">
              Supports PDF, DOC, XLSX, images and more
            </p>
          </div>
          
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Or upload from link</h3>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Link size={16} className="text-gray-400" />
                </div>
                <input 
                  type="text"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Paste file URL here"
                  value={linkInput}
                  onChange={e => setLinkInput(e.target.value)}
                  disabled={uploading}
                />
              </div>
              <button 
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-2 rounded-md text-sm font-medium"
                disabled={!linkInput || uploading}
              >
                Add
              </button>
            </div>
          </div>
          
          {files.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Files ({files.length})</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                {files.map((file, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between bg-gray-50 rounded-md p-2"
                  >
                    <div className="flex items-center">
                      <File size={16} className="text-gray-500 mr-2" />
                      <div>
                        <p className="text-xs font-medium text-gray-700 truncate max-w-[200px]" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button 
                      className="text-gray-400 hover:text-red-500"
                      onClick={() => removeFile(index)}
                      disabled={uploading}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {uploading && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-gray-700">Uploading...</p>
                <p className="text-xs text-gray-500">{uploadProgress}%</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-indigo-500 h-2 rounded-full transition-all" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t flex justify-end space-x-3">
          <button 
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none"
            onClick={handleClose}
            disabled={uploading}
          >
            Cancel
          </button>
          <button 
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadModal;