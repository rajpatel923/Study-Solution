// components/DocumentEditModal.tsx
import React, { useRef, useEffect, useState } from 'react';
import { Document, DocumentMetadata } from '@/lib/documents';
import { gsap } from 'gsap';
import { X, Save } from 'lucide-react';
import { parseMetadata } from '@/utils/documentUtils';

interface DocumentEditModalProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: number, data: Partial<Document>) => Promise<void>;
}

const DocumentEditModal: React.FC<DocumentEditModalProps> = ({
  document,
  isOpen,
  onClose,
  onSave
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [fileName, setFileName] = useState('');
  const [metadata, setMetadata] = useState<DocumentMetadata | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && document) {
      // document.body.style.overflow = 'hidden';
      setFileName(document.originalFileName);
      setMetadata(parseMetadata(document.metadata));
      
      // Animate modal in
      gsap.fromTo(
        overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.2 }
      );
      
      gsap.fromTo(
        modalRef.current,
        { 
          y: 20, 
          opacity: 0 
        },
        { 
          y: 0, 
          opacity: 1, 
          duration: 0.3, 
          ease: 'back.out(1.2)' 
        }
      );
    } else {
      // document.body.style.overflow = 'auto';
    }

    return () => {
      // document.body.style.overflow = 'auto';
    };
  }, [isOpen, document]);

  const handleClose = () => {
    if (saving) return;
    
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

  const handleMetadataChange = (key: string, value: any) => {
    if (!metadata) return;
    
    setMetadata({
      ...metadata,
      [key]: value
    });
  };

  const handleSave = async () => {
    if (!document || saving) return;
    
    setSaving(true);
    
    try {
      await onSave(document.id, {
        originalFileName: fileName,
        metadata: metadata ? JSON.stringify(metadata) : null
      });
      
      // Success animation
      const saveBtn = document.querySelector('#save-btn');
      if (saveBtn) {
        gsap.fromTo(
          saveBtn,
          { backgroundColor: '#10B981' },
          { backgroundColor: '#4F46E5', duration: 1, ease: 'power2.out' }
        );
      }
      
      handleClose();
    } catch (error) {
      console.error('Save error:', error);
      // Error animation shake
      gsap.to(modalRef.current, {
        x: [-10, 10, -10, 10, 0],
        duration: 0.5,
        ease: 'power2.out'
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !document) return null;

  return (
    <div 
      ref={overlayRef}
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Edit Document Properties</h2>
          <button 
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
            onClick={handleClose}
            disabled={saving}
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="mb-4">
            <label htmlFor="fileName" className="block text-sm font-medium text-gray-700 mb-1">
              File Name
            </label>
            <input
              id="fileName"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              disabled={saving}
            />
          </div>
          
          {metadata && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">Metadata</h3>
              
              {Object.entries(metadata).map(([key, value]) => {
                // Skip complex objects or arrays
                if (typeof value === 'object') return null;
                
                if (typeof value === 'boolean') {
                  return (
                    <div key={key} className="mb-4">
                      <div className="flex items-center">
                        <input
                          id={key}
                          type="checkbox"
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          checked={Boolean(value)}
                          onChange={(e) => handleMetadataChange(key, e.target.checked)}
                          disabled={saving}
                        />
                        <label htmlFor={key} className="ml-2 block text-sm text-gray-700 capitalize">
                          {key.replace(/([A-Z])/g, ' $1')}
                        </label>
                      </div>
                    </div>
                  );
                }
                
                return (
                  <div key={key} className="mb-4">
                    <label htmlFor={key} className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </label>
                    <input
                      id={key}
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      value={value as string || ''}
                      onChange={(e) => handleMetadataChange(key, e.target.value)}
                      disabled={saving}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t flex justify-end space-x-3">
          <button 
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none"
            onClick={handleClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button 
            id="save-btn"
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <Save size={16} className="mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentEditModal;