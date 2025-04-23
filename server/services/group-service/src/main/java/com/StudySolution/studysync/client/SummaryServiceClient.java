package com.StudySolution.studysync.client;

import com.StudySolution.studysync.DTO.SummaryDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;

@FeignClient(name = "summary-service")
public interface SummaryServiceClient {
    @GetMapping("/api/summaries/{summaryId}")
    SummaryDto getSummary(@PathVariable String summaryId, @RequestHeader("userId") String userId);
}
