package com.StudySolution.studysync.controller;

import com.StudySolution.studysync.DTO.SharedItemDto;
import com.StudySolution.studysync.model.SharedItem;
import com.StudySolution.studysync.model.enums.AccessType;
import com.StudySolution.studysync.service.GroupService;
import com.StudySolution.studysync.service.SharedItemService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/groups/{groupId}/items")
@CrossOrigin(origins = "http://localhost:3000",
        allowCredentials = "true",
        methods = { RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE })
public class SharedItemController {

    private final SharedItemService sharedItemService;
    private final GroupService groupService;

    @Autowired
    public SharedItemController(SharedItemService sharedItemService, GroupService groupService) {
        this.sharedItemService = sharedItemService;
        this.groupService = groupService;
    }

    @PostMapping
    public ResponseEntity<SharedItem> shareItem(
            @PathVariable String groupId,
            @RequestBody SharedItemDto sharedItemDto,
            @RequestHeader("userId") String userId) {
        // Verify user is member of the group
        if (!groupService.isUserMemberOfGroup(groupId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // Verify user can share in this group
        if (!groupService.canUserShareInGroup(groupId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        SharedItem sharedItem = sharedItemService.shareItem(
                groupId,
                sharedItemDto.getItemId(),
                sharedItemDto.getItemType(),
                userId,
                sharedItemDto.getTitle(),
                sharedItemDto.getDescription(),
                sharedItemDto.getAccessType() != null ? sharedItemDto.getAccessType() : AccessType.VIEW
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(sharedItem);
    }

    @GetMapping
    public ResponseEntity<List<SharedItem>> getSharedItems(
            @PathVariable String groupId,
            @RequestHeader("userId") String userId) {
        // Verify user is member of the group
        if (!groupService.isUserMemberOfGroup(groupId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(sharedItemService.getSharedItemsByGroupId(groupId));
    }

    @GetMapping("/{sharedItemId}")
    public ResponseEntity<SharedItem> getSharedItem(
            @PathVariable String groupId,
            @PathVariable String sharedItemId,
            @RequestHeader("userId") String userId) {
        // Verify user is member of the group
        if (!groupService.isUserMemberOfGroup(groupId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        SharedItem sharedItem = sharedItemService.getSharedItemById(sharedItemId);

        // Verify the shared item belongs to the specified group
        if (!sharedItem.getGroupId().equals(groupId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        return ResponseEntity.ok(sharedItem);
    }

    @DeleteMapping("/{sharedItemId}")
    public ResponseEntity<Void> removeSharedItem(
            @PathVariable String groupId,
            @PathVariable String sharedItemId,
            @RequestHeader("userId") String userId) {
        // Verify user is member of the group
        if (!groupService.isUserMemberOfGroup(groupId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        SharedItem sharedItem = sharedItemService.getSharedItemById(sharedItemId);

        // Verify the shared item belongs to the specified group
        if (!sharedItem.getGroupId().equals(groupId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        sharedItemService.removeSharedItem(sharedItemId, userId);
        return ResponseEntity.noContent().build();
    }
}

