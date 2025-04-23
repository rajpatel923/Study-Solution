package com.StudySolution.studysync.service;

import com.StudySolution.studysync.DocumentDTO.DocumentDTO;
import com.StudySolution.studysync.DocumentDTO.DocumentResponse;
import com.StudySolution.studysync.config.StudySyncAzureStorageProperties;
import com.StudySolution.studysync.models.Document;
import com.StudySolution.studysync.repository.DocumentRepository;
import com.StudySolution.studysync.util.DocumentUtil;
import com.azure.storage.blob.BlobClient;
import com.azure.storage.blob.BlobContainerClient;
import com.azure.storage.blob.sas.BlobSasPermission;
import com.azure.storage.blob.sas.BlobServiceSasSignatureValues;
import com.azure.storage.common.sas.SasProtocol;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Slf4j
public class DocumentServiceImpl implements DocumentService {

    private final DocumentRepository documentRepository;
    private final BlobContainerClient containerClient;
    private final StudySyncAzureStorageProperties azureStorageProperties;
    private final DocumentUtil documentUtils;

    public DocumentServiceImpl(
            DocumentRepository documentRepository,
            BlobContainerClient containerClient,
            StudySyncAzureStorageProperties azureStorageProperties,
            DocumentUtil documentUtils) {
        this.documentRepository = documentRepository;
        this.containerClient = containerClient;
        this.azureStorageProperties = azureStorageProperties;
        this.documentUtils = documentUtils;
    }

    @Override
    @Transactional
    public DocumentResponse uploadDocument(MultipartFile file, String userId, String userName) throws IOException {
        try {
            // Validate file
            documentUtils.validateFile(file);

            // Generate unique blob name
            String blobName = documentUtils.generateUniqueBlobName(file.getOriginalFilename());

            // Get file extension
            String fileExtension = documentUtils.getFileExtension(file.getOriginalFilename());

            // Upload to Azure Blob Storage
            BlobClient blobClient = containerClient.getBlobClient(blobName);
            blobClient.upload(file.getInputStream(), file.getSize(), true);

            // Get public URL
            String publicUrl = blobClient.getBlobUrl();

            // Extract page count if PDF
            Integer pageCount = null;
            if ("pdf".equalsIgnoreCase(fileExtension)) {
                try (PDDocument pdDocument = PDDocument.load(file.getInputStream())) {
                    pageCount = pdDocument.getNumberOfPages();
                } catch (Exception e) {
                    log.warn("Could not extract page count from PDF: {}", e.getMessage());
                }
            }

            // Save document metadata to database
            Document document = Document.builder()
                    .fileName(blobName)
                    .userId(userId)
                    .userName(userName)
                    .originalFileName(file.getOriginalFilename())
                    .contentType(file.getContentType())
                    .fileSize(file.getSize())
                    .publicUrl(publicUrl)
                    .blobName(blobName)
                    .pageCount(pageCount)
                    .fileExtension(fileExtension)
                    .uploadDateTime(LocalDateTime.now())
                    .active(true)
                    .build();

            Document savedDocument = documentRepository.save(document);

            log.info("Document uploaded successfully: {}", blobName);

            return DocumentResponse.builder()
                    .id(savedDocument.getId())
                    .fileName(savedDocument.getOriginalFileName())
                    .publicUrl(savedDocument.getPublicUrl())
                    .message("Document uploaded successfully")
                    .success(true)
                    .build();

        } catch (Exception e) {
            log.error("Failed to upload document", e);
            return DocumentResponse.builder()
                    .message("Failed to upload document: " + e.getMessage())
                    .success(false)
                    .build();
        }
    }

    @Override
    public Optional<DocumentDTO> getDocumentById(Long id) {
        return documentRepository.findByIdAndActiveTrue(id)
                .map(doc -> {
                    // Update last access time
                    doc.setLastAccessDateTime(LocalDateTime.now());
                    documentRepository.save(doc);

                    return documentUtils.convertToDTO(doc);
                });
    }

    @Override
    public List<DocumentDTO> getAllDocuments() {
        return documentRepository.findByActiveTrue().stream()
                .map(documentUtils::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public boolean deleteDocument(Long id) {
        return documentRepository.findByIdAndActiveTrue(id)
                .map(document -> {
                    document.setActive(false);
                    documentRepository.save(document);
                    log.info("Document soft-deleted: {}", document.getBlobName());
                    return true;
                })
                .orElse(false);
    }

    @Override
    public List<DocumentDTO> getDocumentsByUserId(String userId) {
        List<Document> userDocuments = documentRepository.findByUserIdAndActiveTrue(userId);
        return userDocuments.stream()
                .map(documentUtils::convertToDTO)
                .collect(Collectors.toList());
    }


    @Override
    @Transactional
    public boolean permanentlyDeleteDocument(Long id) {
        return documentRepository.findById(id)
                .map(document -> {
                    try {
                        // Delete from Azure
                        BlobClient blobClient = containerClient.getBlobClient(document.getBlobName());
                        blobClient.deleteIfExists();

                        // Delete from database
                        documentRepository.delete(document);

                        log.info("Document permanently deleted: {}", document.getBlobName());
                        return true;
                    } catch (Exception e) {
                        log.error("Failed to permanently delete document", e);
                        return false;
                    }
                })
                .orElse(false);
    }

    @Override
    public List<DocumentDTO> searchDocumentsByFileName(String fileName) {
        return documentRepository.searchByFileName(fileName).stream()
                .map(documentUtils::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<DocumentDTO> getRecentDocuments(int days) {
        return documentRepository.findRecentDocuments(days).stream()
                .map(documentUtils::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public Optional<byte[]> getDocumentContent(Long id) {
        return documentRepository.findByIdAndActiveTrue(id)
                .map(document -> {
                    try {
                        // Get blob content
                        BlobClient blobClient = containerClient.getBlobClient(document.getBlobName());

                        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
                        blobClient.download(outputStream);

                        // Update last access time
                        document.setLastAccessDateTime(LocalDateTime.now());
                        documentRepository.save(document);

                        return outputStream.toByteArray();
                    } catch (Exception e) {
                        log.error("Failed to retrieve document content", e);
                        return null;
                    }
                });
    }

    @Override
    @Transactional
    public Optional<DocumentDTO> updateDocumentMetadata(Long id, String metadata) {
        return documentRepository.findByIdAndActiveTrue(id)
                .map(document -> {
                    document.setMetadata(metadata);
                    Document updatedDocument = documentRepository.save(document);
                    log.info("Document metadata updated: {}", document.getBlobName());
                    return documentUtils.convertToDTO(updatedDocument);
                });
    }

    @Override
    @Transactional
    public Optional<DocumentDTO> updateDocumentPageCount(Long id, Integer pageCount) {
        return documentRepository.findByIdAndActiveTrue(id)
                .map(document -> {
                    document.setPageCount(pageCount);
                    Document updatedDocument = documentRepository.save(document);
                    log.info("Document page count updated: {}", document.getBlobName());
                    return documentUtils.convertToDTO(updatedDocument);
                });
    }

    @Override
    public Optional<String> generateSasUrl(Long id, int expiryMinutes) {
        return documentRepository.findByIdAndActiveTrue(id)
                .map(document -> {
                    try {
                        BlobClient blobClient = containerClient.getBlobClient(document.getBlobName());

                        // Check if blob exists first
                        if (!blobClient.exists()) {
                            log.error("Blob not found: {}", document.getBlobName());
                            return null;
                        }

                        // Set SAS permissions (only allow read)
                        BlobSasPermission sasPermission = new BlobSasPermission()
                                .setReadPermission(true);

                        // Set expiry time
                        OffsetDateTime expiryTime = OffsetDateTime.now().plusMinutes(expiryMinutes);

                        // Generate SAS token with specified permissions and expiry time
                        BlobServiceSasSignatureValues sasSignatureValues = new BlobServiceSasSignatureValues(
                                expiryTime, sasPermission)
                                .setProtocol(SasProtocol.HTTPS_ONLY);

                        // Get SAS token and construct URL
                        String sasToken = blobClient.generateSas(sasSignatureValues);
                        String sasUrl = blobClient.getBlobUrl() + "?" + sasToken;

                        // Update last access time
                        document.setLastAccessDateTime(LocalDateTime.now());
                        documentRepository.save(document);

                        log.info("Generated SAS URL for document: {}, expires in {} minutes",
                                document.getBlobName(), expiryMinutes);

                        return sasUrl;
                    } catch (Exception e) {
                        log.error("Failed to generate SAS URL for document: {}", document.getBlobName(), e);
                        return null;
                    }
                });
    }

    @Override
    public List<DocumentDTO> getAllDocumentsWithPreview(int previewExpiryMinutes) {
        List<Document> documents = documentRepository.findByActiveTrue();
        return documents.stream()
                .map(doc -> {
                    DocumentDTO dto = documentUtils.convertToDTO(doc);
                    generateSasUrl(doc.getId(), previewExpiryMinutes)
                            .ifPresent(dto::setPreviewUrl);
                    return dto;
                })
                .collect(Collectors.toList());
    }

    @Override
    public List<DocumentDTO> getDocumentsByUserIdWithPreview(String userId, int previewExpiryMinutes) {
        List<Document> userDocuments = documentRepository.findByUserIdAndActiveTrue(userId);
        return userDocuments.stream()
                .map(doc -> {
                    DocumentDTO dto = documentUtils.convertToDTO(doc);
                    generateSasUrl(doc.getId(), previewExpiryMinutes)
                            .ifPresent(dto::setPreviewUrl);
                    return dto;
                })
                .collect(Collectors.toList());
    }


}