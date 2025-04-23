import { useState, useRef } from 'react';
import { Upload, X, File, Image, Video } from 'lucide-react';
import { shareItem } from '@/services/groupService';

interface FileUploadProps {
  groupId: string;
  onUploadComplete?: (fileData: any[]) => void;
}

export default function FileUpload({ groupId, onUploadComplete }: FileUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      setFiles([...files, ...newFiles]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFiles([...files, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    const fileType = file.type;
    if (fileType.startsWith('image/')) {
      return <Image size={20} className="text-blue-500" />;
    } else if (fileType.startsWith('video/')) {
      return <Video size={20} className="text-purple-500" />;
    } else {
      return <File size={20} className="text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    setUploadProgress(0);
    setError(null);
    
    const uploadedFiles = [];
    const totalFiles = files.length;
    let completedFiles = 0;
    
    try {
      // In a real application, you would have a file upload service 
      // that could handle multi-part form data to upload the file to a CDN or S3
      for (const file of files) {
        try {
          // Mock file upload - in a real app, this would be a call to your file upload API
          // For example:
          // const formData = new FormData();
          // formData.append('file', file);
          // const uploadResponse = await fetch('/api/upload', { method: 'POST', body: formData });
          // const uploadResult = await uploadResponse.json();
          // const fileUrl = uploadResult.fileUrl;
          
          // Since we don't have a real file upload, we'll create a fake URL
          const fileUrl = URL.createObjectURL(file);
          
          // Share the uploaded file with the group
          const itemType = file.type.startsWith('image/') 
            ? 'IMAGE' 
            : file.type.startsWith('video/') 
              ? 'VIDEO' 
              : 'DOCUMENT';
              
          const shareResponse = await shareItem(groupId, {
            itemId: `file-${Date.now()}-${completedFiles}`,
            itemType: itemType as any,
            title: file.name,
            description: `Uploaded on ${new Date().toLocaleDateString()}`,
            accessType: 'VIEW',
          });
          
          // Add file to uploaded files list
          uploadedFiles.push({
            ...shareResponse,
            attachmentUrl: fileUrl,
            size: formatFileSize(file.size)
          });
          
          // Update progress
          completedFiles++;
          setUploadProgress(Math.round((completedFiles / totalFiles) * 100));
        } catch (err) {
          console.error('Error uploading file:', file.name, err);
          setError(`Failed to upload ${file.name}`);
        }
      }
      
      if (uploadedFiles.length > 0 && onUploadComplete) {
        onUploadComplete(uploadedFiles);
      }
      
      // Clear files after successful upload
      if (uploadedFiles.length === files.length) {
        setFiles([]);
      }
    } catch (error) {
      console.error('Error during file upload process:', error);
      setError('An error occurred during the upload process');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">Upload Files</h2>
      
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer ${
          dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          multiple
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileInputChange}
        />
        <Upload size={36} className={`mx-auto ${dragging ? 'text-blue-500' : 'text-gray-400'}`} />
        <p className="mt-2 text-sm font-medium text-gray-700">
          Drag and drop files here or click to browse
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Supports documents, images, videos, and more
        </p>
      </div>
      
      {/* File list */}
      {files.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Files to upload:</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <div className="flex items-center space-x-2 overflow-hidden">
                  {getFileIcon(file)}
                  <div className="truncate">
                    <p className="text-sm truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button 
                  className="p-1 text-gray-500 hover:text-red-500 hover:bg-gray-100 rounded-full flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}
      
      {/* Upload progress */}
      {uploading && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-gray-700">Uploading...</span>
            <span className="text-sm text-gray-700">{uploadProgress}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}
      
      {/* Upload button */}
      {files.length > 0 && !uploading && (
        <button
          className="mt-4 w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          onClick={uploadFiles}
        >
          Upload {files.length} {files.length === 1 ? 'file' : 'files'}
        </button>
      )}
    </div>
  );
}