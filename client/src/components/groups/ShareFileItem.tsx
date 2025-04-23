import { useState } from 'react';
import { File, Image, Video, Download, MoreVertical, Trash2, Edit, Eye } from 'lucide-react';

interface SharedFileItemProps {
  id: string;
  itemId: string;
  itemType: 'DOCUMENT' | 'FLASHCARD_SET' | 'SUMMARY' | 'IMAGE' | 'VIDEO' | 'OTHER';
  title: string;
  description?: string;
  size?: string;
  addedBy: string;
  addedAt: string;
  fileExtension?: string;
  attachmentUrl?: string;
  accessType?: "VIEW" | "EDIT";
  onDownload?: (id: string, url?: string) => void;
  onDelete?: (id: string) => void;
  onPreview?: (item: any) => void;
}

export default function SharedFileItem({
  id,
  itemId,
  itemType,
  title,
  description,
  size,
  addedBy,
  addedAt,
  fileExtension,
  attachmentUrl,
  accessType,
  onDownload,
  onDelete,
  onPreview,
}: SharedFileItemProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const getFileIcon = () => {
    switch (itemType) {
      case 'IMAGE':
        return <Image size={20} className="text-blue-500" />;
      case 'VIDEO':
        return <Video size={20} className="text-purple-500" />;
      case 'FLASHCARD_SET':
        return <File size={20} className="text-green-500" />;
      case 'SUMMARY':
        return <File size={20} className="text-orange-500" />;
      default:
        return <File size={20} className="text-gray-500" />;
    }
  };

  const getFileExtension = () => {
    if (fileExtension) return fileExtension;
    
    if (title) {
      const parts = title.split('.');
      if (parts.length > 1) {
        return parts[parts.length - 1].toLowerCase();
      }
    }
    
    // Default extensions based on type
    if (itemType === 'IMAGE') return 'png';
    if (itemType === 'VIDEO') return 'mp4';
    return 'doc';
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      return dateString;
    }
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload(id, attachmentUrl);
    } else if (attachmentUrl) {
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = attachmentUrl;
      link.download = title || `file.${getFileExtension()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setDropdownOpen(false);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(id);
    }
    setDropdownOpen(false);
  };

  const handlePreview = () => {
    if (onPreview) {
      onPreview({
        id,
        itemType,
        title,
        description,
        attachmentUrl,
      });
    }
    setDropdownOpen(false);
  };

  return (
    <div className="p-4 hover:bg-gray-50">
      <div className="flex items-center justify-between">
        <div 
          className="flex items-center space-x-3 flex-1 min-w-0"
          onClick={handlePreview}
          style={{ cursor: onPreview ? 'pointer' : 'default' }}
        >
          {getFileIcon()}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 truncate">{title}</h3>
            <div className="flex items-center text-xs text-gray-500">
              <span className="truncate">
                {size && `${size} • `}Shared by {addedBy || 'Unknown'} • {formatDate(addedAt)}
              </span>
              {accessType && (
                <span className="ml-2 px-1.5 py-0.5 bg-gray-100 rounded text-xs">
                  {accessType === 'EDIT' ? 'Can edit' : 'View only'}
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-gray-500 mt-1 truncate">{description}</p>
            )}
          </div>
        </div>
        <div className="relative">
          <button 
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <MoreVertical size={16} />
          </button>
          
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200">
              {itemType === 'IMAGE' || itemType === 'VIDEO' ? (
                <button
                  className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={handlePreview}
                >
                  <Eye size={16} className="mr-2" />
                  Preview
                </button>
              ) : null}
              
              <button
                className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={handleDownload}
              >
                <Download size={16} className="mr-2" />
                Download
              </button>
              
              {onDelete && (
                <button
                  className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  onClick={handleDelete}
                >
                  <Trash2 size={16} className="mr-2" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}