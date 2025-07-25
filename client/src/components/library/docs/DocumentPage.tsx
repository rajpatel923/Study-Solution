// pages/documents.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Document, FileCategory, SortOption, ViewMode } from '@/lib/documents';
import documentService from '@/services/documentService';
import { filterDocumentsByCategory, searchDocuments, sortDocuments } from '@/utils/documentUtils';

// Components
import SearchBar from '@/components/library/docs/SearchBar';
import FilterBar from '@/components/library/docs/FilterBar';
import DocumentGrid from '@/components/library/docs/DocumentGrid';
import DocumentList from '@/components/library/docs/DocumentList';
import EmptyState from '@/components/library/docs/EmptyState';
import UploadModal from '@/components/library/docs/UploadModule';
import DocumentViewModal from '@/components/library/docs/DocumentViewModel';
import DocumentEditModal from '@/components/library/docs/DocumentEditModel';
import { gsap } from 'gsap';
import { Upload, AlertTriangle, Check } from 'lucide-react';

const DocumentsPage: React.FC = () => {
  // State for documents
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for filtering and sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<FileCategory>('All');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  // State for modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  
  // Notification state
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Load documents
  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await documentService.getAllDocuments();
      setDocuments(data);
    } catch (err) {
      console.error('Failed to load documents:', err);
      setError('Failed to load documents. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Display notification
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  // Handle document upload
  const handleUpload = async (files: File[]) => {
    try {
      for (const file of files) {
        await documentService.uploadDocument(file);
      }
      
      await loadDocuments();
      showNotification('success', `Successfully uploaded ${files.length} document(s)`);
    } catch (err) {
      console.error('Upload error:', err);
      showNotification('error', 'Failed to upload documents. Please try again.');
    }
  };

  // Handle document deletion
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      await documentService.deleteDocument(id);
      
      // Animate out the deleted document
      const documentElement = document.querySelector(`[data-document-id="${id}"]`);
      if (documentElement) {
        gsap.to(documentElement, {
          opacity: 0,
          y: -20,
          height: 0,
          marginBottom: 0,
          duration: 0.3,
          onComplete: () => {
            // Remove from state after animation completes
            setDocuments(prev => prev.filter(doc => doc.id !== id));
          }
        });
      } else {
        // If animation can't be applied, remove directly
        setDocuments(prev => prev.filter(doc => doc.id !== id));
      }
      
      showNotification('success', 'Document deleted successfully');
    } catch (err) {
      console.error('Delete error:', err);
      showNotification('error', 'Failed to delete document. Please try again.');
    }
  };

  // Handle document update
  const handleUpdate = async (id: number, data: Partial<Document>) => {
    try {
      const updatedDoc = await documentService.updateDocument(id, data);
      
      setDocuments(prev => 
        prev.map(doc => (doc.id === id ? { ...doc, ...updatedDoc } : doc))
      );
      
      showNotification('success', 'Document updated successfully');
    } catch (err) {
      console.error('Update error:', err);
      showNotification('error', 'Failed to update document. Please try again.');
    }
  };

  // Handle document download
  const handleDownload = (document: Document) => {
    window.open(document.publicUrl, '_blank');
  };

  // Handle document click (view)
  const handleDocumentClick = (document: Document) => {
    setSelectedDocument(document);
    setViewModalOpen(true);
  }

  // Handle edit modal
  const handleEdit = (document: Document) => {
    setSelectedDocument(document);
    setViewModalOpen(false);
    setEditModalOpen(true);
  };

  // Apply filters and sorting
  const filteredDocuments = sortDocuments(
    searchDocuments(
      filterDocumentsByCategory(documents, activeCategory),
      searchQuery
    ),
    sortBy,
    sortOrder
  );

  // Loading and error states
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4"></div>
          <p className="text-gray-600">Loading documents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-700 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            onClick={loadDocuments}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">My Documents</h1>
            <p className="text-gray-500">
              {documents.length} document{documents.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            className="mt-4 md:mt-0 flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            onClick={() => setUploadModalOpen(true)}
          >
            <Upload className="h-5 w-5 mr-2" />
            Upload
          </button>
        </div>
        
        {/* Notification */}
        {notification && (
          <div 
            className={`fixed top-4 right-4 z-50 flex items-center px-4 py-3 rounded-lg shadow-lg max-w-sm ${
              notification.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {notification.type === 'success' ? (
              <Check className="h-5 w-5 mr-2 text-green-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
            )}
            <p>{notification.message}</p>
          </div>
        )}
        
        {/* Search and filter bar */}
        <div className="mb-6 space-y-4">
          <SearchBar 
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by file name or content..."
          />
          
          <FilterBar
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            sortBy={sortBy}
            onSortChange={setSortBy}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </div>
        
        {/* Document list/grid */}
        <div className="mb-8">
          {documents.length === 0 ? (
            <EmptyState onUpload={() => setUploadModalOpen(true)} />
          ) : filteredDocuments.length === 0 ? (
            <div className="bg-white p-8 rounded-lg text-center">
              <p className="text-gray-500">No documents match your search criteria.</p>
            </div>
          ) : viewMode === 'grid' ? (
            <DocumentGrid
              documents={filteredDocuments}
              onDocumentClick={handleDocumentClick}
              onDownload={handleDownload}
              onDelete={handleDelete}
            />
          ) : (
            <DocumentList
              documents={filteredDocuments}
              onDocumentClick={handleDocumentClick}
              onDownload={handleDownload}
              onDelete={handleDelete}
            />
          )}
        </div>
      </div>
      
      {/* Modals */}
      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUpload={handleUpload}
      />
      
      <DocumentViewModal
        document={selectedDocument}
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        onDownload={handleDownload}
        onEdit={handleEdit}
      />
      
      <DocumentEditModal
        document={selectedDocument}
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={handleUpdate}
      />
    </div>
  );
};

export default DocumentsPage;