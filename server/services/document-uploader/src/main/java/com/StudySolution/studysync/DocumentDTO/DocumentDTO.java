package com.StudySolution.studysync.DocumentDTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentDTO {
    private Long id;
    private String fileName;
    private String userName;
    private String userId;
    private String originalFileName;
    private String contentType;
    private Long fileSize;
    private String publicUrl;
    private Integer pageCount;
    private String fileExtension;
    private String metadata;
    private LocalDateTime uploadDateTime;
    private LocalDateTime lastAccessDateTime;
}