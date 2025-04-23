package com.StudySolution.studysync.DTO;

import com.StudySolution.studysync.model.enums.MessageType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Data
public class MessageDto {
    private String content;
    private MessageType type = MessageType.TEXT;
    private String attachmentUrl;

}