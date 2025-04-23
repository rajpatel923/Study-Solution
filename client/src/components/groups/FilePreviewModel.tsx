import { useState } from 'react';
import { X, Download, File, Image, Video, ExternalLink } from 'lucide-react';

interface FilePreviewModalProps {
  item: {
    id: string;
    itemType: 'DOCUMENT' | 'FLASHCARD_SET' | 'SUMMARY' | 'IMAGE' | 'VIDEO' | 'OTHER';
    title: string;
    description?: string;
    attachmentUrl?: string;
  };
  onClose: () => void;
  onDownload?: (id: string, url?: string) => void;
}

export default function FilePreviewModal({ item, onClose, onDownload }: FilePreviewModalProps) {
  const [loadError, setLoadError] = useState(false);

  const getFileExtension = () => {
    if (item.title) {
      const parts = item.title.split('.');
      if (parts.length > 1) {
        return parts[parts.length - 1].toLowerCase();
      }
    }
    
    // Default extensions based on type
    if (item.itemType === 'IMAGE') return 'png';
    if (item.itemType === 'VIDEO') return 'mp4';
    return 'pdf';
  };

  const isPDF = () => {
    const ext = getFileExtension();
    return ext === 'pdf';
  };

  const isImage = () => {
    if (item.itemType === 'IMAGE') return true;
    
    const ext = getFileExtension();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
  };

  const isVideo = () => {
    if (item.itemType === 'VIDEO') return true;
    
    const ext = getFileExtension();
    return ['mp4', 'webm', 'ogg', 'mov'].includes(ext);
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload(item.id, item.attachmentUrl);
    } else if (item.attachmentUrl) {
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = item.attachmentUrl;
      link.download = item.title || `file.${getFileExtension()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col relative">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold truncate">{item.title}</h2>
          <div className="flex items-center space-x-2">
            <button
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              onClick={handleDownload}
            >
              <Download size={20} />
            </button>
            <button
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              onClick={onClose}
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-hidden flex items-center justify-center bg-gray-100 p-4">
          {isImage() && item.attachmentUrl ? (
            loadError ? (
              <div className="text-center p-8">
                <File size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">Unable to display this image</p>
                <button 
                  className="mt-2 text-blue-500 hover:underline flex items-center justify-center"
                  onClick={handleDownload}
                >
                  <Download size={16} className="mr-1" />
                  Download instead
                </button>
              </div>
            ) : (
              <img
                src={item.attachmentUrl}
                alt={item.title}
                className="max-w-full max-h-[calc(90vh-8rem)] object-contain"
                onError={() => setLoadError(true)}
              />
            )
          ) : isVideo() && item.attachmentUrl ? (
            <video
              controls
              className="max-w-full max-h-[calc(90vh-8rem)]"
              src={item.attachmentUrl}
              onError={() => setLoadError(true)}
            >
              Your browser does not support the video tag.
            </video>
          ) : isPDF() && item.attachmentUrl ? (
            <iframe
              src={item.attachmentUrl}
              className="w-full h-[calc(90vh-8rem)]"
              title={item.title}
              onError={() => setLoadError(true)}
            />
          ) : (
            <div className="text-center p-8">
              <File size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">Preview not available for this file type</p>
              <button 
                className="mt-2 text-blue-500 hover:underline flex items-center justify-center"
                onClick={handleDownload}
              >
                <Download size={16} className="mr-1" />
                Download instead
              </button>
            </div>
          )}
        </div>
        
        {/* Footer */}
        {item.description && (
          <div className="p-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">{item.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}