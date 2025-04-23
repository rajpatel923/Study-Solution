package com.StudySolution.studysync.DTO;

import com.StudySolution.studysync.model.enums.MessageType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.awt.*;
import java.time.LocalDateTime;

@Document(collection = "messages")
@AllArgsConstructor
@NoArgsConstructor
@Data
public class Message {
    @Id
    private String id;
    private String groupId;
    private String senderId;
    private String content;
    private LocalDateTime sentAt;
    private MessageType type;
    private String attachmentUrl;


    public Message(String groupId, String senderId, String content, MessageType type) {
        this.groupId = groupId;
        this.senderId = senderId;
        this.content = content;
        this.sentAt = LocalDateTime.now();
        this.type = type;
    }

}