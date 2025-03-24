package com.StudySolution.studysync.repository;

import com.StudySolution.studysync.models.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface DocumentRepository extends JpaRepository<Document, Long> {
    List<Document> findByActiveTrue();

    Optional<Document> findByIdAndActiveTrue(Long id);

    Optional<Document> findByBlobNameAndActiveTrue(String blobName);

    List<Document> findByUserIdAndActiveTrue(String userId);

    @Query("SELECT d FROM Document d WHERE d.fileName LIKE %?1% AND d.active = true")
    List<Document> searchByFileName(String fileName);

    // Alternative using native SQL query
    @Query(value = "SELECT * FROM document d WHERE d.created_date > DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ?1 DAY)", nativeQuery = true)
    List<Document> findRecentDocuments(int days);

    // If you need documents from last N hours instead of days
    @Query(value = "SELECT * FROM document d WHERE d.created_date > DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ?1 HOUR)", nativeQuery = true)
    List<Document> findRecentDocumentsByHours(int hours);

    // Custom query to find documents by content type
    List<Document> findByContentTypeAndActiveTrue(String contentType);
}
