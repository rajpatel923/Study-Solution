package com.StudySolution.studysync.controller;

import com.StudySolution.studysync.DTO.ChatMessage;
import com.StudySolution.studysync.DTO.Message;
import com.StudySolution.studysync.client.UserServiceClient;
import com.StudySolution.studysync.service.GroupService;
import com.StudySolution.studysync.service.MessageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.RequestMethod;

@Controller
@CrossOrigin(origins = "http://localhost:3000",
        allowCredentials = "true",
        methods = { RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE })
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final MessageService messageService;
    private final GroupService groupService;
    private final UserServiceClient userServiceClient;

    @Autowired
    public ChatController(
            SimpMessagingTemplate messagingTemplate,
            MessageService messageService,
            GroupService groupService,
            UserServiceClient userServiceClient) {
        this.messagingTemplate = messagingTemplate;
        this.messageService = messageService;
        this.groupService = groupService;
        this.userServiceClient = userServiceClient;
    }

    @MessageMapping("/chat.sendMessage/{groupId}")
    public void sendMessage(@DestinationVariable String groupId, @Payload ChatMessage chatMessage) {
        // Verify user is member of the group
        if (!groupService.isUserMemberOfGroup(groupId, chatMessage.getSenderId())) {
            return; // Silently drop messages from non-members
        }

        // Save the message to database
        Message message = new Message(groupId, chatMessage.getSenderId(), chatMessage.getContent(), chatMessage.getType());
        message.setAttachmentUrl(chatMessage.getAttachmentUrl());
        messageService.sendMessage(message);

        // Broadcast to all subscribers
        messagingTemplate.convertAndSend("/topic/group." + groupId, chatMessage);
    }

    @MessageMapping("/chat.shareItem/{groupId}")
    public void shareItem(@DestinationVariable String groupId, @Payload ChatMessage chatMessage) {
        // Verify user can share in this group
        if (!groupService.canUserShareInGroup(groupId, chatMessage.getSenderId())) {
            return; // Silently drop messages from users who can't share
        }

        // The content contains the shared item details (itemId, itemType)
        // This would be processed by the client to display appropriately

        // Save the message to database
        Message message = new Message(groupId, chatMessage.getSenderId(), chatMessage.getContent(), chatMessage.getType());
        messageService.sendMessage(message);

        // Broadcast to all subscribers
        messagingTemplate.convertAndSend("/topic/group." + groupId, chatMessage);
    }
}