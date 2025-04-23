package com.StudySolution.studysync.service;

import com.StudySolution.studysync.DTO.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface MessageService {
    Message sendMessage(Message message);
    Page<Message> getGroupMessages(String groupId, Pageable pageable);
    Message getMessageById(String messageId);
    void deleteMessage(String messageId, String userId);
}
