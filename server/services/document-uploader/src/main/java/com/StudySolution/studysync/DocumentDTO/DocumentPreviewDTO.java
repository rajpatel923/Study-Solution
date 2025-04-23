package com.StudySolution.studysync.DocumentDTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentPreviewDTO {
    private Long id;
    private String fileName;
    private String originalFileName;
    private String contentType;
    private String previewUrl;
    private Integer pageCount;
    private String fileExtension;
    private String message;
}