package com.StudySolution.studysync.controller;

import com.StudySolution.studysync.DocumentDTO.DocumentDTO;
import com.StudySolution.studysync.DocumentDTO.DocumentPreviewDTO;
import com.StudySolution.studysync.DocumentDTO.DocumentResponse;
import com.StudySolution.studysync.service.DocumentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/v1/documents")
@Slf4j
@Tag(name = "Document Management API", description = "API endpoints for document management")
public class DocumentController {

    private final DocumentService  documentService;
    private static final int DEFAULT_SAS_EXPIRY_MINUTES = 60;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @PostMapping("/upload")
    @Operation(summary = "Upload a document", description = "Uploads a document to Azure Blob Storage and saves metadata")
    @ApiResponse(responseCode = "200", description = "Document uploaded successfully",
            content = @Content(schema = @Schema(implementation = DocumentResponse.class)))
    @ApiResponse(responseCode = "400", description = "Invalid file format or file size")
    @ApiResponse(responseCode = "500", description = "Internal server error during upload")
    public ResponseEntity<DocumentResponse> uploadDocument(
            @RequestParam("file") MultipartFile file, @RequestHeader(value = "X-User-ID", required = true) String userId, @RequestHeader(value = "X-User-Name", required = false) String userName) {
        try {
            DocumentResponse response = documentService.uploadDocument(file, userId, userName);
            if (response.isSuccess()) {
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.badRequest().body(response);
            }
        } catch (IllegalArgumentException e) {
            log.error("Invalid file upload request: {}", e.getMessage());
            return ResponseEntity.badRequest().body(
                    DocumentResponse.builder()
                            .message("Invalid file: " + e.getMessage())
                            .success(false)
                            .build()
            );
        } catch (IOException e) {
            log.error("Error uploading file: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                    DocumentResponse.builder()
                            .message("Error uploading file: " + e.getMessage())
                            .success(false)
                            .build()
            );
        }
    }

    @GetMapping("/user")
    @Operation(summary = "Get all documents for the current user",
            description = "Retrieves all active documents belonging to the authenticated user")
    public ResponseEntity<List<DocumentDTO>> getUserDocuments(
            @RequestHeader(value = "X-User-ID", required = true) String userId) {
        System.out.println(userId);
        List<DocumentDTO> documents = documentService.getDocumentsByUserId(userId);
        return ResponseEntity.ok(documents);
    }

    @GetMapping
    @Operation(summary = "Get all documents", description = "Retrieves all active documents")
    public ResponseEntity<List<DocumentDTO>> getAllDocuments() {
        List<DocumentDTO> documents = documentService.getAllDocuments();
        return ResponseEntity.ok(documents);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get document by ID", description = "Retrieves a document by its ID")
    public ResponseEntity<DocumentDTO> getDocumentById(@PathVariable Long id) {
        return documentService.getDocumentById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/download/{id}")
    @Operation(summary = "Download document by ID", description = "Downloads the document content")
    public ResponseEntity<byte[]> downloadDocument(@PathVariable Long id) {
        return documentService.getDocumentById(id)
                .flatMap(doc -> documentService.getDocumentContent(id)
                        .map(content -> {
                            HttpHeaders headers = new HttpHeaders();
                            headers.setContentType(MediaType.parseMediaType(doc.getContentType()));
                            headers.setContentDispositionFormData("attachment", doc.getOriginalFileName());
                            headers.setContentLength(doc.getFileSize());
                            return new ResponseEntity<>(content, headers, HttpStatus.OK);
                        })
                )
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete document by ID", description = "Soft deletes a document by its ID")
    public ResponseEntity<Void> deleteDocument(@PathVariable Long id) {
        boolean deleted = documentService.deleteDocument(id);
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}/permanent")
    @Operation(summary = "Permanently delete document", description = "Permanently deletes a document from both database and storage")
    public ResponseEntity<Void> permanentlyDeleteDocument(@PathVariable Long id) {
        boolean deleted = documentService.permanentlyDeleteDocument(id);
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    @GetMapping("/search")
    @Operation(summary = "Search documents by filename", description = "Searches for documents by filename")
    public ResponseEntity<List<DocumentDTO>> searchDocuments(@RequestParam String fileName) {
        List<DocumentDTO> documents = documentService.searchDocumentsByFileName(fileName);
        return ResponseEntity.ok(documents);
    }

    @GetMapping("/recent")
    @Operation(summary = "Get recent documents", description = "Retrieves documents uploaded within a specified number of days")
    public ResponseEntity<List<DocumentDTO>> getRecentDocuments(@RequestParam(defaultValue = "7") int days) {
        List<DocumentDTO> documents = documentService.getRecentDocuments(days);
        return ResponseEntity.ok(documents);
    }

    @PutMapping("/{id}/metadata")
    @Operation(summary = "Update document metadata", description = "Updates the metadata for a document")
    public ResponseEntity<DocumentDTO> updateDocumentMetadata(
            @PathVariable Long id,
            @RequestBody String metadata) {
        return documentService.updateDocumentMetadata(id, metadata)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/page-count")
    @Operation(summary = "Update document page count", description = "Updates the page count for a document")
    public ResponseEntity<DocumentDTO> updateDocumentPageCount(
            @PathVariable Long id,
            @RequestParam Integer pageCount) {
        return documentService.updateDocumentPageCount(id, pageCount)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/preview")
    @Operation(summary = "Get document preview URL",
            description = "Generates a temporary SAS URL for document preview")
    public ResponseEntity<DocumentPreviewDTO> getDocumentPreviewUrl(
            @PathVariable Long id,
            @RequestParam(defaultValue = "60") int expiryMinutes) {

        return documentService.getDocumentById(id)
                .flatMap(doc -> documentService.generateSasUrl(id, expiryMinutes)
                        .map(sasUrl -> DocumentPreviewDTO.builder()
                                .id(doc.getId())
                                .fileName(doc.getFileName())
                                .originalFileName(doc.getOriginalFileName())
                                .contentType(doc.getContentType())
                                .previewUrl(sasUrl)
                                .pageCount(doc.getPageCount())
                                .fileExtension(doc.getFileExtension())
                                .message("Preview URL generated successfully")
                                .build()))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/health")
    @Operation(summary = "Health check", description = "Checks if the service is up and running")
    public ResponseEntity<String> healthCheck() {
        return ResponseEntity.ok("Document Uploader Service is running");
    }

    @GetMapping("/with-preview")
    @Operation(summary = "Get all documents with preview URLs",
            description = "Retrieves all active documents with temporary preview URLs")
    public ResponseEntity<List<DocumentDTO>> getAllDocumentsWithPreview(
            @RequestParam(defaultValue = "60") int expiryMinutes) {
        List<DocumentDTO> documents = documentService.getAllDocumentsWithPreview(expiryMinutes);
        return ResponseEntity.ok(documents);
    }

    @GetMapping("/user/with-preview")
    @Operation(summary = "Get all documents for the current user with preview URLs",
            description = "Retrieves all active documents belonging to the authenticated user with preview URLs")
    public ResponseEntity<List<DocumentDTO>> getUserDocumentsWithPreview(
            @RequestHeader(value = "X-User-ID", required = true) String userId,
            @RequestParam(defaultValue = "60") int expiryMinutes) {
        List<DocumentDTO> documents = documentService.getDocumentsByUserIdWithPreview(userId, expiryMinutes);
        return ResponseEntity.ok(documents);
    }

}
