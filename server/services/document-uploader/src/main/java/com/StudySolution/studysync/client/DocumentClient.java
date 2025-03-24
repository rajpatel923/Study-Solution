package com.StudySolution.studysync.client;

import com.StudySolution.studysync.DocumentDTO.DocumentDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "document-uploader-service")
public interface DocumentClient {

    @GetMapping("/api/documents/{id}")
    ResponseEntity<DocumentDTO> getDocumentById(@PathVariable("id") Long id);
}