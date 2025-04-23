import { useState, useRef } from 'react';
import { X, File, Image, Video } from 'lucide-react';
import { shareItem } from '@/services/groupService';

interface ShareItemModalProps {
  groupId: string;
  onClose: () => void;
  onItemShared: (newItem: any) => void;
}

export default function ShareItemModal({ groupId, onClose, onItemShared }: ShareItemModalProps) {
  const [formData, setFormData] = useState({
    itemId: '',
    itemType: 'DOCUMENT',
    title: '',
    description: '',
    accessType: 'VIEW',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileSelected, setFileSelected] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setFileSelected(file);
      setError(null);
      
      // Update form with file information
      const itemType = getItemTypeFromFile(file);
      setFormData({
        ...formData,
        itemId: `file-${Date.now()}`, // In a real app, this would be the file ID after upload
        title: file.name,
        itemType,
      });
    }
  };

  const getItemTypeFromFile = (file: File): 'DOCUMENT' | 'FLASHCARD_SET' | 'SUMMARY' | 'IMAGE' | 'VIDEO' | 'OTHER' => {
    const fileType = file.type.toLowerCase();
    
    if (fileType.startsWith('image/')) {
      return 'IMAGE';
    } else if (fileType.startsWith('video/')) {
      return 'VIDEO';
    } else if (fileType.includes('pdf') || 
               fileType.includes('document') || 
               fileType.includes('sheet') || 
               fileType.includes('presentation')) {
      return 'DOCUMENT';
    } else {
      return 'OTHER';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const getFileIcon = () => {
    if (!fileSelected) return <File size={28} className="mx-auto text-gray-400 mb-2" />;
    
    const fileType = fileSelected.type.toLowerCase();
    
    if (fileType.startsWith('image/')) {
      return <Image size={28} className="mx-auto text-blue-500 mb-2" />;
    } else if (fileType.startsWith('video/')) {
      return <Video size={28} className="mx-auto text-purple-500 mb-2" />;
    } else {
      return <File size={28} className="mx-auto text-gray-500 mb-2" />;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fileSelected) {
      setError('Please select a file to share');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // In a real app, you would first upload the file to your storage service
      // For example:
      // const formData = new FormData();
      // formData.append('file', fileSelected);
      // const uploadResponse = await fetch('/api/upload', { method: 'POST', body: formData });
      // const uploadResult = await uploadResponse.json();
      // const fileUrl = uploadResult.fileUrl;
      
      // For demo, we'll use a data URL (not recommended for production)
      const fileUrl = await readFileAsDataURL(fileSelected);
      
      // Share the item with the group
      const response = await shareItem(groupId, {
        itemId: formData.itemId,
        itemType: formData.itemType as any,
        title: formData.title,
        description: formData.description,
        accessType: formData.accessType as any,
      });

      // Add the file URL to the response (in a real app, this would come from the backend)
      const enhancedResponse = {
        ...response,
        attachmentUrl: fileUrl,
        size: formatFileSize(fileSelected.size),
      };

      if (onItemShared) {
        onItemShared(enhancedResponse);
      }
      
      onClose();
    } catch (error) {
      console.error('Error sharing item:', error);
      setError('Failed to share the file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Share Item with Group</h2>
          <button
            className="text-gray-400 hover:text-gray-500"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4">
          <form onSubmit={handleSubmit}>
            {/* File upload */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select File
              </label>
              <div 
                className="flex items-center justify-center h-32 rounded-lg border-2 border-dashed border-gray-300 cursor-pointer overflow-hidden relative hover:border-blue-400"
                onClick={() => fileInputRef.current?.click()}
              >
                {fileSelected ? (
                  <div className="text-center">
                    {getFileIcon()}
                    <p className="text-sm font-medium truncate max-w-xs">{fileSelected.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatFileSize(fileSelected.size)}
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <File size={28} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-sm font-medium text-gray-700">Click to select a file</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Documents, images, videos and more
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  id="file-input"
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
              {error && (
                <p className="mt-1 text-xs text-red-500">{error}</p>
              )}
            </div>

            {/* Title */}
            <div className="mb-4">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Title*
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter a title for this item"
              />
            </div>

            {/* Description */}
            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={2}
                value={formData.description}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add a brief description"
              />
            </div>

            {/* Access type */}
            <div className="mb-4">
              <label htmlFor="accessType" className="block text-sm font-medium text-gray-700 mb-1">
                Access Type
              </label>
              <select
                id="accessType"
                name="accessType"
                value={formData.accessType}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="VIEW">View only</option>
                <option value="EDIT">Allow editing</option>
              </select>
            </div>

            {/* Submit buttons */}
            <div className="flex justify-end space-x-2 mt-6">
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={loading || !formData.title || !fileSelected}
              >
                {loading ? 'Sharing...' : 'Share'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}