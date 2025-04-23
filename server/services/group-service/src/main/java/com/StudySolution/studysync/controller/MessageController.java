package com.StudySolution.studysync.controller;

import com.StudySolution.studysync.DTO.Message;
import com.StudySolution.studysync.DTO.MessageDto;
import com.StudySolution.studysync.service.GroupService;
import com.StudySolution.studysync.service.MessageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/groups/{groupId}/messages")
@CrossOrigin(origins = "http://localhost:3000",
        allowCredentials = "true",
        methods = { RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE })
public class MessageController {

    private final MessageService messageService;
    private final GroupService groupService;

    @Autowired
    public MessageController(MessageService messageService, GroupService groupService) {
        this.messageService = messageService;
        this.groupService = groupService;
    }

    @PostMapping
    public ResponseEntity<Message> sendMessage(
            @PathVariable String groupId,
            @RequestBody MessageDto messageDto,
            @RequestHeader("userId") String userId) {
        // Verify user is member of the group
        if (!groupService.isUserMemberOfGroup(groupId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Message message = new Message(groupId, userId, messageDto.getContent(), messageDto.getType());
        message.setAttachmentUrl(messageDto.getAttachmentUrl());

        return ResponseEntity.status(HttpStatus.CREATED).body(messageService.sendMessage(message));
    }

    @GetMapping
    public ResponseEntity<Page<Message>> getGroupMessages(
            @PathVariable String groupId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestHeader("userId") String userId) {
        // Verify user is member of the group
        if (!groupService.isUserMemberOfGroup(groupId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "sentAt"));
        return ResponseEntity.ok(messageService.getGroupMessages(groupId, pageRequest));
    }

    @DeleteMapping("/{messageId}")
    public ResponseEntity<Void> deleteMessage(
            @PathVariable String groupId,
            @PathVariable String messageId,
            @RequestHeader("userId") String userId) {
        // Verify user is member of the group
        if (!groupService.isUserMemberOfGroup(groupId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        messageService.deleteMessage(messageId, userId);
        return ResponseEntity.noContent().build();
    }
}