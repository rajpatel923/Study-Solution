package com.StudySolution.studysync.service;

import com.StudySolution.studysync.DTO.Message;
import com.StudySolution.studysync.exception.ResourceNotFoundException;
import com.StudySolution.studysync.exception.UnauthorizedException;
import com.StudySolution.studysync.repository.MessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class MessageServiceImpl implements MessageService {

    private final MessageRepository messageRepository;
    private final GroupService groupService;

    @Autowired
    public MessageServiceImpl(MessageRepository messageRepository, GroupService groupService) {
        this.messageRepository = messageRepository;
        this.groupService = groupService;
    }

    @Override
    public Message sendMessage(Message message) {
        // Check if user is a member of the group
        if (!groupService.isUserMemberOfGroup(message.getGroupId(), message.getSenderId())) {
            throw new UnauthorizedException("User is not a member of the group");
        }

        message.setSentAt(LocalDateTime.now());
        return messageRepository.save(message);
    }

    @Override
    public Page<Message> getGroupMessages(String groupId, Pageable pageable) {
        return messageRepository.findByGroupIdOrderBySentAtDesc(groupId, pageable);
    }

    @Override
    public Message getMessageById(String messageId) {
        return messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found with id: " + messageId));
    }

    @Override
    public void deleteMessage(String messageId, String userId) {
        Message message = getMessageById(messageId);

        // Check if user is the sender or a group admin/owner
        if (!message.getSenderId().equals(userId) &&
                !groupService.getGroupById(message.getGroupId()).isOwnerOrAdmin(userId)) {
            throw new UnauthorizedException("User is not allowed to delete this message");
        }

        messageRepository.delete(message);
    }
}