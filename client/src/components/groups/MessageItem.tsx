import { File, Image, Video, Download } from 'lucide-react';
import { useState } from 'react';

interface Attachment {
  name: string;
  url: string;
  size: string;
  type: string;
}

interface MessageItemProps {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  sentAt: string; // Backend property name
  timestamp?: string; // Alternative property name
  type: 'TEXT' | 'FILE' | 'IMAGE' | 'SHARE';
  attachmentUrl?: string;
  isCurrentUser: boolean;
}

export default function MessageItem({
  senderId,
  senderName,
  senderAvatar,
  content,
  type,
  sentAt,
  timestamp,
  attachmentUrl,
  isCurrentUser,
}: MessageItemProps) {
  const [imageError, setImageError] = useState(false);
  
  // Use sentAt or timestamp (whichever is provided)
  const messageTime = timestamp || sentAt;

  // Helper function to get file type from URL
  const getFileExtension = (url?: string) => {
    if (!url) return '';
    const parts = url.split('.');
    return parts[parts.length - 1].toLowerCase();
  };

  // Helper function to get file icon
  const getFileIcon = () => {
    if (!attachmentUrl) return <File size={20} />;
    
    const extension = getFileExtension(attachmentUrl);
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
      return <Image size={20} className="text-blue-500" />;
    } else if (['mp4', 'mov', 'avi', 'webm'].includes(extension)) {
      return <Video size={20} className="text-purple-500" />;
    } else {
      return <File size={20} className="text-gray-500" />;
    }
  };

  // Helper function to get file size display text
  const getFileSize = () => {
    // This would normally be provided by the server
    return "Unknown size";
  };
  
  // Helper function to get file name from URL
  const getFileName = (url?: string) => {
    if (!url) return 'File';
    const parts = url.split('/');
    return parts[parts.length - 1];
  };

  // Format timestamp
  const formatTime = (timestampStr: string) => {
    try {
      const date = new Date(timestampStr);
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className={`flex ${isCurrentUser ? 'justify-end' : ''} mb-4`}>
      <div className={`max-w-md ${isCurrentUser ? 'order-2' : 'order-1'}`}>
        {!isCurrentUser && (
          <div className="flex items-center mb-1">
            {senderAvatar ? (
              <img
                src={senderAvatar}
                alt={senderName}
                className="h-6 w-6 rounded-full mr-2"
              />
            ) : (
              <div className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center mr-2">
                <span className="text-xs font-medium text-gray-600">
                  {senderName.substring(0, 2).toUpperCase()}
                </span>
              </div>
            )}
            <span className="text-sm font-medium">{senderName}</span>
          </div>
        )}
        <div
          className={`rounded-lg p-3 ${
            isCurrentUser
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {type === 'TEXT' ? (
            <p className="text-sm whitespace-pre-wrap">{content}</p>
          ) : type === 'IMAGE' && attachmentUrl && !imageError ? (
            <div>
              <img 
                src={attachmentUrl} 
                alt="Shared image" 
                className="max-w-full rounded-md max-h-72 object-contain mb-2"
                onError={() => setImageError(true)}
              />
              {content && <p className="text-sm mt-2">{content}</p>}
            </div>
          ) : (
            <div>
              <div className="flex items-center space-x-2 p-2 bg-white bg-opacity-10 rounded">
                {getFileIcon()}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{getFileName(attachmentUrl)}</p>
                  <p className="text-xs opacity-70">{getFileSize()}</p>
                </div>
                <a
                  href={attachmentUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-1.5 rounded-full ${
                    isCurrentUser ? 'bg-white bg-opacity-20' : 'bg-gray-200'
                  } hover:opacity-80`}
                >
                  <Download size={16} />
                </a>
              </div>
              {content && <p className="text-sm mt-2">{content}</p>}
            </div>
          )}
        </div>
        <div className={`text-xs text-gray-500 mt-1 ${isCurrentUser ? 'text-right' : ''}`}>
          {formatTime(messageTime)}
        </div>
      </div>
    </div>
  );
}