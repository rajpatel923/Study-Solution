package com.studysolution.studysync.models;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@NoArgsConstructor
public class ErrorDetails {
    private Date timestamp;
    private String message;
    private String details;

    public ErrorDetails(Date timestamp, String message, String details) {
        super();
        this.timestamp = timestamp;
        this.message = message;
        this.details = details;
    }

    // Getters (and setters if needed)
    public Date getTimestamp() {
        return timestamp;
    }
    public String getMessage() {
        return message;
    }
    public String getDetails() {
        return details;
    }
}
