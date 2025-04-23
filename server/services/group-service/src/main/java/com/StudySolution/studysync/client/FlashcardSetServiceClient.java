package com.StudySolution.studysync.client;

import com.StudySolution.studysync.DTO.FlashcardSetDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;

@FeignClient(name = "flashcard-service")
public interface FlashcardSetServiceClient {
    @GetMapping("/api/flashcard-sets/{flashcardSetId}")
    FlashcardSetDto getFlashcardSet(@PathVariable String flashcardSetId, @RequestHeader("userId") String userId);


}