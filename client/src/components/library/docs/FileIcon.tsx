"use client";

import React from 'react';
import { 
  FileText, 
  FileImage, 
  FileVideo, 
  FileSpreadsheet, 
  FileSpreadsheetIcon, 
  File 
} from 'lucide-react';

interface FileIconProps {
  fileType: string;
  size?: number;
  className?: string;
}

const FileIcon: React.FC<FileIconProps> = ({ fileType, size = 24, className = '' }) => {
  const getIcon = () => {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return <FileText size={size} className={`text-red-500 ${className}`} />;
      case 'doc':
      case 'docx':
        return <FileText size={size} className={`text-blue-500 ${className}`} />;
      case 'xls':
      case 'xlsx':
        return <FileSpreadsheet size={size} className={`text-green-500 ${className}`} />;
      case 'ppt':
      case 'pptx':
        return <FileSpreadsheetIcon size={size} className={`text-orange-500 ${className}`} />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <FileImage size={size} className={`text-purple-500 ${className}`} />;
      case 'mp4':
      case 'mov':
      case 'avi':
        return <FileVideo size={size} className={`text-blue-400 ${className}`} />;
      default:
        return <File size={size} className={`text-gray-500 ${className}`} />;
    }
  };

  return (
    <div className="flex items-center justify-center">
      {getIcon()}
    </div>
  );
};

export default FileIcon;