package com.StudySolution.studysync.DTO;

import com.StudySolution.studysync.model.enums.MessageType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Data
public class ChatMessage {
    private String groupId;
    private String senderId;
    private String senderName;
    private String content;
    private MessageType type;
    private String attachmentUrl;
    private long timestamp;

    public ChatMessage(String groupId, String senderId, String senderName, String content,
                       MessageType type, String attachmentUrl) {
        this.groupId = groupId;
        this.senderId = senderId;
        this.senderName = senderName;
        this.content = content;
        this.type = type;
        this.attachmentUrl = attachmentUrl;
        this.timestamp = System.currentTimeMillis();
    }

}