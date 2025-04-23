package com.StudySolution.studysync.service;

import com.StudySolution.studysync.DocumentDTO.DocumentDTO;
import com.StudySolution.studysync.DocumentDTO.DocumentResponse;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

public interface DocumentService {

    /**
     * Upload a document to Azure Blob Storage and save metadata in database
     * @param file The file to upload
     * @return DocumentResponse with upload status
     * @throws IOException If file cannot be processed
     */
    DocumentResponse uploadDocument(MultipartFile file, String userId, String userName) throws IOException;

    /**
     * Get a document by its ID
     * @param id The document ID
     * @return Optional containing the document if found
     */
    Optional<DocumentDTO> getDocumentById(Long id);

    /**
     * Get all active documents
     * @return List of all active documents
     */
    List<DocumentDTO> getAllDocuments();

    /**
     * Delete a document by ID (soft delete)
     * @param id The document ID
     * @return true if document was deleted, false otherwise
     */
    boolean deleteDocument(Long id);

    /**
     * Get all documents for a specific user
     * @param userId The user ID
     * @return List of documents belonging to the user
     */
    List<DocumentDTO> getDocumentsByUserId(String userId);

    /**
     * Permanently delete a document from both database and Azure storage
     * @param id The document ID
     * @return true if document was permanently deleted, false otherwise
     */
    boolean permanentlyDeleteDocument(Long id);

    /**
     * Search for documents by file name
     * @param fileName The file name to search for
     * @return List of matching documents
     */
    List<DocumentDTO> searchDocumentsByFileName(String fileName);

    /**
     * Get recent documents uploaded within a specified number of days
     * @param days Number of days
     * @return List of recent documents
     */
    List<DocumentDTO> getRecentDocuments(int days);

    /**
     * Get document content as byte array
     * @param id The document ID
     * @return Optional byte array of document content
     */
    Optional<byte[]> getDocumentContent(Long id);

    /**
     * Update document metadata (like adding page count after analysis)
     * @param id The document ID
     * @param metadata The metadata to update
     * @return Updated DocumentDTO
     */
    Optional<DocumentDTO> updateDocumentMetadata(Long id, String metadata);

    /**
     * Update document page count
     * @param id The document ID
     * @param pageCount The number of pages
     * @return Updated DocumentDTO
     */
    Optional<DocumentDTO> updateDocumentPageCount(Long id, Integer pageCount);

    /**
     * Generate a temporary SAS token URL for document preview
     * @param id The document ID
     * @param expiryMinutes How long the URL should be valid (in minutes)
     * @return Optional containing the SAS URL if document found
     */
    Optional<String> generateSasUrl(Long id, int expiryMinutes);

    /**
     * Get all active documents with preview URLs
     * @param previewExpiryMinutes How long the preview URLs should be valid (in minutes)
     * @return List of all active documents with preview URLs
     */
    List<DocumentDTO> getAllDocumentsWithPreview(int previewExpiryMinutes);

    /**
     * Get all documents for a specific user with preview URLs
     * @param userId The user ID
     * @param previewExpiryMinutes How long the preview URLs should be valid (in minutes)
     * @return List of documents belonging to the user with preview URLs
     */
    List<DocumentDTO> getDocumentsByUserIdWithPreview(String userId, int previewExpiryMinutes);
}
