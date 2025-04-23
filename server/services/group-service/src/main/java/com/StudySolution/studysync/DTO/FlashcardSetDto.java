package com.StudySolution.studysync.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Data
public class FlashcardSetDto {
    private String id;
    private String title;
    private String description;
    private String contentType;
    private int flashcardCount;
    private String documentId;
    private List<String> tags;
    private String createdAt;

}