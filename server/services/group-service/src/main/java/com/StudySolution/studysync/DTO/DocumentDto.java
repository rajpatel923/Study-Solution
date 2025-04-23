package com.StudySolution.studysync.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class DocumentDto {
    private String id;
    private String title;
    private int pageCount;
    private String url;
    private String uploadedAt;
}