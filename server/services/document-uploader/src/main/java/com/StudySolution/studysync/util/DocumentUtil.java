package com.StudySolution.studysync.util;

import com.StudySolution.studysync.DocumentDTO.DocumentDTO;
import com.StudySolution.studysync.models.Document;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Component
@Slf4j
public class DocumentUtil {

    private static final Set<String> ALLOWED_CONTENT_TYPES = new HashSet<>(Arrays.asList(
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "image/jpeg",
            "image/png",
            "text/plain"
    ));

    private static final long MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

    /**
     * Validates that the uploaded file meets requirements
     * @param file The file to validate
     * @throws IllegalArgumentException if file doesn't meet requirements
     */
    public void validateFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be empty");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size exceeds the maximum allowed size of 50MB");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("File type not supported. Supported file types: PDF, Word, Excel, PowerPoint, JPEG, PNG, and TXT");
        }
    }

    /**
     * Generates a unique blob name for storage
     * @param originalFilename The original file name
     * @return Unique blob name
     */
    public String generateUniqueBlobName(String originalFilename) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss"));
        String randomUUID = UUID.randomUUID().toString().substring(0, 8);
        String extension = getFileExtension(originalFilename);

        return String.format("%s-%s.%s", timestamp, randomUUID, extension);
    }

    /**
     * Extracts the file extension from the original filename
     * @param filename The original filename
     * @return The file extension
     */
    public String getFileExtension(String filename) {
        if (filename == null || filename.lastIndexOf(".") == -1) {
            return "";
        }
        return filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
    }

    /**
     * Converts Document entity to DocumentDTO
     * @param document The Document entity
     * @return DocumentDTO
     */
    public DocumentDTO convertToDTO(Document document) {
        return DocumentDTO.builder()
                .id(document.getId())
                .userId(document.getUserId())
                .userName(document.getUserName())
                .fileName(document.getFileName())
                .originalFileName(document.getOriginalFileName())
                .contentType(document.getContentType())
                .fileSize(document.getFileSize())
                .publicUrl(document.getPublicUrl())
                .previewUrl(null)
                .pageCount(document.getPageCount())
                .fileExtension(document.getFileExtension())
                .metadata(document.getMetadata())
                .uploadDateTime(document.getUploadDateTime())
                .lastAccessDateTime(document.getLastAccessDateTime())
                .build();
    }

    /**
     * Converts Document entity to DocumentDTO with a preview URL
     * @param document The Document entity
     * @param previewUrl The preview URL to include in the DTO
     * @return DocumentDTO with preview URL
     */
    public DocumentDTO convertToDTOWithPreview(Document document, String previewUrl) {
        DocumentDTO dto = convertToDTO(document);
        dto.setPreviewUrl(previewUrl);
        return dto;
    }
}