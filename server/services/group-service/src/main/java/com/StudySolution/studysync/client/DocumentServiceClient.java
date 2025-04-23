package com.StudySolution.studysync.client;

import com.StudySolution.studysync.DTO.DocumentDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;

@FeignClient(name = "document-uploader-service")
public interface DocumentServiceClient {
    @GetMapping("/api/v1/documents/{documentId}")
    DocumentDto getDocument(@PathVariable String documentId, @RequestHeader("userId") String userId);
}
