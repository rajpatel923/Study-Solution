'use client'; // Add this to mark as a client component

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  UserPlus, 
  Settings, 
  Paperclip, 
  Send, 
  File,
  X,
  Info,
  MessageSquare
} from 'lucide-react';
import Layout from '../../layout';
import MessageItem from '@/components/groups/MessageItem';
import SharedFileItem from '@/components/groups/ShareFileItem';
import GroupMemberItem from '@/components/groups/GroupMemberItem';
import FileUpload from '@/components/groups/FileUpload';
import ShareItemModal from '@/components/groups/ShareItemModel';
import GroupSettings from '@/components/groups/GroupSettings';
import FilePreviewModal from '@/components/groups/FilePreviewModel';
import { useWebSocket } from '@/components/groups/WebSocketProvider';
import {
  getGroupById,
  getGroupItems,
  getGroupMessages,
  sendMessage,
  addMember,
  removeMember,
  updateMemberRole,
  removeSharedItem,
  type Group,
  type Member,
  type SharedItem,
  type Message
} from '@/services/groupService';

// Helper function to safely get initials from a name
const getInitials = (name?: string) => {
  if (!name) return '??';
  return name.substring(0, 2).toUpperCase();
};

export default function GroupDetail() {
  // Use useParams to get the route params in App Router
  const params = useParams();
  const router = useRouter();
  const groupId = params?.id as string;
  
  const [group, setGroup] = useState<Group | null>(null);
  const [sharedItems, setSharedItems] = useState<SharedItem[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'messages' | 'files' | 'members'>('messages');
  const [showAddMember, setShowAddMember] = useState(false);
  const [showShareItem, setShowShareItem] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [previewItem, setPreviewItem] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Get current user ID from localStorage (in a real app this would be from auth)
  const currentUserId = useRef<string>('');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      currentUserId.current = localStorage.getItem('userId') || '5';
    }
  }, []);
  
  // Access WebSocket context
  const webSocketContext = typeof window !== 'undefined' ? useWebSocket() : null;
  const isConnected = webSocketContext?.isConnected;
  const wsSendMessage = webSocketContext?.sendMessage;
  const subscribe = webSocketContext?.subscribe;

  // Fetch group data
  useEffect(() => {
    if (!groupId) return;

    const fetchGroupData = async () => {
      try {
        setLoading(true);
        const groupData = await getGroupById(groupId);
        setGroup(groupData);
      } catch (error) {
        console.error('Error fetching group data:', error);
        router.push('/dashboard/groups');
      } finally {
        setLoading(false);
      }
    };

    fetchGroupData();
  }, [groupId, router]);

  // Fetch shared items
  useEffect(() => {
    if (!groupId) return;

    const fetchSharedItems = async () => {
      try {
        const items = await getGroupItems(groupId);
        setSharedItems(items);
      } catch (error) {
        console.error('Error fetching shared items:', error);
      }
    };

    fetchSharedItems();
  }, [groupId]);

  // Fetch messages and set up WebSocket subscription
  useEffect(() => {
    if (!groupId || typeof window === 'undefined') return;

    const fetchMessages = async () => {
      try {
        setIsLoadingMore(true);
        const response = await getGroupMessages(groupId, 0, 20);
        setMessages(response.content || []);
        setHasMoreMessages(response.content.length < response.totalElements);
        setCurrentPage(0);
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setIsLoadingMore(false);
      }
    };

    fetchMessages();

    // Subscribe to group messages via WebSocket
    let unsubscribe = () => {};
    
    if (subscribe) {
      console.log(`Setting up WebSocket subscription for group: ${groupId}`);
      const topicPath = `/topic/group.${groupId}`;
      
      unsubscribe = subscribe(topicPath, (message) => {
        console.log('📩 New message received via WebSocket:', message);
        
        // Make sure we don't add duplicate messages
        setMessages(prev => {
          // Check if we already have this message
          if (message && message.id && prev.some(m => m.id === message.id)) {
            console.log('Duplicate message detected, ignoring');
            return prev;
          }
          
          // Add the new message
          console.log('Adding new message to state');
          return [...prev, message];
        });
      });
      
      console.log(`WebSocket subscription set up for: ${topicPath}`);
    }

    return () => {
      console.log('Cleaning up WebSocket subscription');
      unsubscribe();
    };
  }, [groupId, subscribe]);

  // Load more messages when scrolling to top
  const loadMoreMessages = async () => {
    if (!groupId || isLoadingMore || !hasMoreMessages) return;
    
    try {
      setIsLoadingMore(true);
      const nextPage = currentPage + 1;
      const response = await getGroupMessages(groupId, nextPage, 20);
      
      if (response.content && response.content.length > 0) {
        // Save current scroll position
        const container = messagesContainerRef.current;
        const scrollHeight = container?.scrollHeight || 0;
        
        // Add older messages at the beginning
        setMessages(prev => [...response.content, ...prev]);
        setCurrentPage(nextPage);
        setHasMoreMessages(response.totalElements > (nextPage + 1) * 20);
        
        // Restore scroll position after new messages are added
        if (container) {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = newScrollHeight - scrollHeight;
        }
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Handle scroll in messages container
  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current;
    if (container && container.scrollTop < 50 && !isLoadingMore && hasMoreMessages) {
      loadMoreMessages();
    }
  };

  // Scroll to bottom of messages when new messages arrive
  useEffect(() => {
    if (activeTab === 'messages' && messagesEndRef.current && !isLoadingMore) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab, isLoadingMore]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !groupId) return;

    try {
      console.log('Sending message to server...');
      
      // Send message to API
      const response = await sendMessage(groupId, {
        content: newMessage,
        type: 'TEXT',
      });
      
      console.log('Message sent successfully via API:', response);
      
      // For real-time delivery, also use WebSocket if available
      if (isConnected && wsSendMessage) {
        console.log('Broadcasting message via WebSocket...');
        wsSendMessage(`/app/chat.sendMessage/${groupId}`, {
          id: response.id || Date.now().toString(),
          groupId,
          senderId: currentUserId.current,
          senderName: 'You',
          content: newMessage,
          type: 'TEXT',
          sentAt: new Date().toISOString(),
        });
      }
      
      // Add message to local state immediately for UI responsiveness
      // We're using the response from API which should have all required fields
      const messageWithSenderName = {
        ...response,
        senderName: 'You', // Make sure we have a sender name for display
      };
      
      setMessages(prev => [...prev, messageWithSenderName]);
      setNewMessage('');
      
      console.log('Message added to local state');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleAddMember = async () => {
    if (!newMemberEmail.trim() || !groupId || !group) return;

    try {
      const updatedGroup = await addMember(groupId, newMemberEmail, newMemberRole);
      setGroup(updatedGroup);
      setNewMemberEmail('');
      setShowAddMember(false);
    } catch (error) {
      console.error('Error adding member:', error);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!groupId || !group) return;

    try {
      const updatedGroup = await removeMember(groupId, userId);
      setGroup(updatedGroup);
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  const handleChangeMemberRole = async (userId: string, newRole: 'ADMIN' | 'MEMBER') => {
    if (!groupId || !group) return;

    try {
      const updatedGroup = await updateMemberRole(groupId, userId, newRole);
      setGroup(updatedGroup);
    } catch (error) {
      console.error('Error changing member role:', error);
    }
  };

  const handleShareFile = (file: File) => {
    setShowFileUpload(true);
  };

  const handleItemShared = (newItem: SharedItem) => {
    setSharedItems([...sharedItems, newItem]);
    setShowShareItem(false);
  };

  const handleFileUploadComplete = (newFiles: SharedItem[]) => {
    setSharedItems([...sharedItems, ...newFiles]);
    setShowFileUpload(false);
    
    // Also send a message to the group about the new file(s)
    if (newFiles.length > 0 && groupId) {
      const fileNames = newFiles.map(file => file.title).join(', ');
      const message = `Shared ${newFiles.length > 1 ? 'files' : 'a file'}: ${fileNames}`;
      
      sendMessage(groupId, {
        content: message,
        type: 'SHARE',
        attachmentUrl: newFiles[0].id,  // This would normally be a file URL
      });
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!groupId) return;

    try {
      await removeSharedItem(groupId, itemId);
      setSharedItems(sharedItems.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };
  
  const handlePreviewItem = (item: any) => {
    setPreviewItem(item);
  };

  const handleGroupUpdated = (updatedGroup: Group) => {
    setGroup(updatedGroup);
    setShowSettings(false);
  };

  // Identify if current user is admin or owner
  const isCurrentUserAdminOrOwner = () => {
    if (!group) return false;
    
    const currentUser = group.members.find(member => member.userId === currentUserId.current);
    return currentUser?.role === 'ADMIN' || currentUser?.role === 'OWNER';
  };

  // Handle text input resize (auto-grow)
  const handleTextAreaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 150)}px`;
  };

  if (loading) {
    return (
      <>
        <div className="flex justify-center items-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </>
    );
  }

  if (!group) {
    return (
      <>
        <div className="flex justify-center items-center h-full">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Group not found</h2>
            <p className="text-gray-600">The group you're looking for doesn't exist or you don't have access to it.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex h-full">
        {/* Main chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Group header */}
          <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
            <div className="flex items-center">
              {group.avatarUrl ? (
                <img
                  src={group.avatarUrl}
                  alt={group.name}
                  className="h-10 w-10 rounded-full mr-3"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mr-3">
                  <span className="text-white font-semibold">
                    {getInitials(group.name)}
                  </span>
                </div>
              )}
              <div>
                <h1 className="text-lg font-semibold">{group.name}</h1>
                <p className="text-sm text-gray-500">{group.members.length} members</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {isCurrentUserAdminOrOwner() && (
                <>
                  <button 
                    className="p-2 rounded-full text-gray-500 hover:bg-gray-100"
                    onClick={() => setShowAddMember(true)}
                  >
                    <UserPlus size={20} />
                  </button>
                  <button 
                    className="p-2 rounded-full text-gray-500 hover:bg-gray-100"
                    onClick={() => setShowSettings(true)}
                  >
                    <Settings size={20} />
                  </button>
                </>
              )}
              <button 
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100"
                onClick={() => setActiveTab('files')}
              >
                <File size={20} />
              </button>
              <button
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100"
                onClick={() => setActiveTab(prev => prev === 'members' ? 'messages' : 'members')}
              >
                <Info size={20} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white border-b border-gray-200">
            <div className="flex">
              <button
                className={`px-4 py-3 text-sm font-medium ${
                  activeTab === 'messages'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('messages')}
              >
                Messages
              </button>
              <button
                className={`px-4 py-3 text-sm font-medium ${
                  activeTab === 'files'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('files')}
              >
                Files
              </button>
              <button
                className={`px-4 py-3 text-sm font-medium ${
                  activeTab === 'members'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('members')}
              >
                Members
              </button>
            </div>
          </div>

          {/* Content based on active tab */}
          <div className="flex-1 overflow-auto">
            {activeTab === 'messages' && (
              <div className="flex flex-col h-full">
                {/* Messages */}
                <div 
                  className="flex-1 overflow-y-auto p-4 space-y-4"
                  ref={messagesContainerRef}
                  onScroll={handleMessagesScroll}
                >
                  {isLoadingMore && (
                    <div className="flex justify-center py-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  )}
                  
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 py-12">
                      <div className="mb-4 p-4 bg-gray-100 rounded-full">
                        <MessageSquare size={32} className="text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-700 mb-2">No messages yet</h3>
                      <p className="text-sm max-w-sm">
                        Start the conversation by sending a message or sharing a file with the group.
                      </p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      // Make sure the message has the expected properties
                      const messageProps = {
                        id: message.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        senderId: message.senderId,
                        senderName: message.senderName || 'Unknown',
                        content: message.content || '',
                        type: message.type as 'TEXT' | 'FILE' | 'IMAGE' | 'SHARE',
                        sentAt: message.sentAt,
                        attachmentUrl: message.attachmentUrl,
                        isCurrentUser: message.senderId === currentUserId.current
                      };
                      
                      return (
                        <MessageItem 
                          key={`message-${messageProps.id}`}
                          {...messageProps}
                        />
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message input */}
                <div className="p-4 border-t border-gray-200 bg-white">
                  <div className="flex items-end space-x-2">
                    <button 
                      className="p-2 text-gray-500 hover:text-gray-700"
                      onClick={() => setShowFileUpload(true)}
                    >
                      <Paperclip size={20} />
                    </button>
                    <div className="flex-1 rounded-lg border border-gray-300 bg-white overflow-hidden">
                      <textarea
                        className="w-full px-3 py-2 text-sm focus:outline-none resize-none min-h-[40px]"
                        placeholder="Type a message..."
                        rows={1}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onInput={handleTextAreaInput}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                    </div>
                    <button
                      className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50"
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'files' && (
              <div className="p-6">
                <div className="mb-4 flex justify-between items-center">
                  <h2 className="text-lg font-semibold">Shared Files</h2>
                  <button 
                    className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    onClick={() => setShowShareItem(true)}
                  >
                    <Paperclip size={16} className="mr-2" />
                    Share File
                  </button>
                </div>

                {sharedItems.length === 0 ? (
                  <div className="text-center py-12">
                    <File size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-700 mb-2">No files shared yet</h3>
                    <p className="text-gray-500 mb-4">
                      Share documents, images, and other files with your group members.
                    </p>
                    <button 
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
                      onClick={() => setShowShareItem(true)}
                    >
                      <Paperclip size={18} className="mr-2" />
                      Share a File
                    </button>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="grid grid-cols-1 divide-y divide-gray-200">
                      {sharedItems.map((item) => {
                        // Ensure all required properties are present
                        const itemProps = {
                          id: item.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                          itemId: item.itemId || `itemid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                          itemType: item.itemType,
                          title: item.title,
                          description: item.description,
                          size: item.size,
                          addedBy: item.addedBy,
                          addedAt: item.addedAt,
                          fileExtension: item.fileExtension,
                          attachmentUrl: item.attachmentUrl,
                          accessType: item.accessType,
                          onDelete: isCurrentUserAdminOrOwner() ? handleDeleteItem : undefined,
                          onPreview: handlePreviewItem
                        };
                        
                        return (
                          <SharedFileItem
                            key={`file-item-${itemProps.id}`}
                            {...itemProps}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'members' && (
              <div className="p-6">
                <div className="mb-4 flex justify-between items-center">
                  <h2 className="text-lg font-semibold">Members</h2>
                  {isCurrentUserAdminOrOwner() && (
                    <button
                      className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      onClick={() => setShowAddMember(true)}
                    >
                      <UserPlus size={16} className="mr-2" />
                      Add Member
                    </button>
                  )}
                </div>

                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="grid grid-cols-1 divide-y divide-gray-200">
                    {group.members.map((member) => (
                      <GroupMemberItem
                        key={`member-item-${member.userId || Math.random().toString(36).substr(2, 9)}`}
                        {...member}
                        isCurrentUser={member.userId === currentUserId.current}
                        onChangeRole={isCurrentUserAdminOrOwner() ? handleChangeMemberRole : undefined}
                        onRemoveMember={isCurrentUserAdminOrOwner() ? handleRemoveMember : undefined}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar for group info */}
        <div className="w-64 bg-white border-l border-gray-200 hidden lg:block overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold mb-1">Group Details</h2>
            <p className="text-sm text-gray-500">{group.description || 'No description provided'}</p>
          </div>

          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold mb-3">Members</h3>
            <div className="space-y-2">
              {group.members.slice(0, 5).map((member) => (
                <div key={member.userId} className="flex items-center">
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt={member.name} className="h-6 w-6 rounded-full mr-2" />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center mr-2">
                      <span className="text-xs font-medium text-gray-600">
                        {getInitials(member.name)}
                      </span>
                    </div>
                  )}
                  <span className="text-sm">{member.name}</span>
                </div>
              ))}
              {group.members.length > 5 && (
                <button
                  className="text-sm text-blue-600 hover:text-blue-800"
                  onClick={() => setActiveTab('members')}
                >
                  View all members
                </button>
              )}
            </div>
          </div>

          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold mb-3">Shared Files</h3>
            <div className="space-y-2">
              {sharedItems.slice(0, 3).map((file) => (
                <div key={`sidebar-file-${file.id}`} className="flex items-center">
                  <File size={16} className="mr-2 text-gray-500" />
                  <div className="flex-1 truncate">
                    <p className="text-sm truncate">{file.title}</p>
                    <p className="text-xs text-gray-500">{file.size}</p>
                  </div>
                </div>
              ))}
              <button
                className="text-sm text-blue-600 hover:text-blue-800"
                onClick={() => setActiveTab('files')}
              >
                View all files
              </button>
            </div>
          </div>

          <div className="p-4">
            <h3 className="text-sm font-semibold mb-2">Group Settings</h3>
            <div className="text-sm text-gray-500">
              <p className="mb-1">
                <span className="font-medium">Visibility:</span>{' '}
                {group.settings.visibility === 'PUBLIC'
                  ? 'Public'
                  : group.settings.visibility === 'PRIVATE'
                  ? 'Private'
                  : 'Invite Only'}
              </p>
              <p>
                <span className="font-medium">File Sharing:</span>{' '}
                {group.settings.allowMemberSharing ? 'All members' : 'Admins only'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add member modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Add Member</h2>
              <button
                className="text-gray-400 hover:text-gray-500"
                onClick={() => setShowAddMember(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email or User ID
                </label>
                <input
                  type="text"
                  id="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email address or user ID"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                />
              </div>
              <div className="mb-4">
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  id="role"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as 'ADMIN' | 'MEMBER')}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="MEMBER">Member</option>
                </select>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  onClick={() => setShowAddMember(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  onClick={handleAddMember}
                >
                  Add Member
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share item modal */}
      {showShareItem && (
        <ShareItemModal
          groupId={groupId}
          onClose={() => setShowShareItem(false)}
          onItemShared={handleItemShared}
        />
      )}

      {/* Group settings modal */}
      {showSettings && group && (
        <GroupSettings
          group={group}
          onClose={() => setShowSettings(false)}
          onGroupUpdated={handleGroupUpdated}
        />
      )}

      {/* File upload component */}
      {showFileUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Upload Files</h2>
              <button
                className="text-gray-400 hover:text-gray-500"
                onClick={() => setShowFileUpload(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <FileUpload
                groupId={groupId}
                onUploadComplete={handleFileUploadComplete}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* File preview modal */}
      {previewItem && (
        <FilePreviewModal 
          item={previewItem}
          onClose={() => setPreviewItem(null)}
          onDownload={(id, url) => {
            // Handle download if needed
            if (url) {
              const link = document.createElement('a');
              link.href = url;
              link.download = previewItem.title || 'download';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }
          }}
        />
      )}
    </>
  );
}