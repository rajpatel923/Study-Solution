package com.StudySolution.studysync.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Data
public class SummaryDto {
    private String id;
    private String text;
    private String documentId;
    private String length;
    private String promptUsed;
    private int wordCount;
    private String type;
    private String createdAt;

    
}