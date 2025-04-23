package com.StudySolution.studysync.controller;

import com.StudySolution.studysync.DTO.GroupDto;
import com.StudySolution.studysync.DTO.MemberRoleUpdateDto;
import com.StudySolution.studysync.model.Group;
import com.StudySolution.studysync.model.enums.GroupMemberRole;
import com.StudySolution.studysync.service.GroupService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/groups")
@CrossOrigin(origins = "http://localhost:3000",
        allowCredentials = "true",
        methods = { RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE })
public class GroupController {

    private final GroupService groupService;

    @Autowired
    public GroupController(GroupService groupService) {
        this.groupService = groupService;
    }

    @PostMapping
    public ResponseEntity<Group> createGroup(@RequestBody GroupDto groupDto, @RequestHeader("userId") String userId) {
        Group group = new Group(groupDto.getName(), groupDto.getDescription(), userId);
        group.setAvatarUrl(groupDto.getAvatarUrl());
        if (groupDto.getSettings() != null) {
            group.setSettings(groupDto.getSettings());
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(groupService.createGroup(group));
    }

    @GetMapping
    public ResponseEntity<List<Group>> getMyGroups(@RequestHeader("userId") String userId) {
        return ResponseEntity.ok(groupService.getGroupsByUserId(userId));
    }

    @GetMapping("/{groupId}")
    public ResponseEntity<Group> getGroupById(@PathVariable String groupId, @RequestHeader("userId") String userId) {
        Group group = groupService.getGroupById(groupId);

        // Check if user is a member of the group
        if (!group.isMember(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(group);
    }

    @PutMapping("/{groupId}")
    public ResponseEntity<Group> updateGroup(
            @PathVariable String groupId,
            @RequestBody GroupDto groupDto,
            @RequestHeader("userId") String userId) {
        Group group = groupService.getGroupById(groupId);

        // Check if user is owner or admin
        if (!group.isOwnerOrAdmin(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        group.setName(groupDto.getName());
        group.setDescription(groupDto.getDescription());
        group.setAvatarUrl(groupDto.getAvatarUrl());
        if (groupDto.getSettings() != null) {
            group.setSettings(groupDto.getSettings());
        }

        return ResponseEntity.ok(groupService.updateGroup(groupId, group));
    }

    @DeleteMapping("/{groupId}")
    public ResponseEntity<Void> deleteGroup(@PathVariable String groupId, @RequestHeader("userId") String userId) {
        Group group = groupService.getGroupById(groupId);

        // Only owner can delete the group
        if (!group.isOwner(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        groupService.deleteGroup(groupId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{groupId}/members")
    public ResponseEntity<Group> addMember(
            @PathVariable String groupId,
            @RequestParam String userId,
            @RequestParam(defaultValue = "MEMBER") GroupMemberRole role,
            @RequestHeader("userId") String currentUserId) {
        Group group = groupService.getGroupById(groupId);

        // Only owner or admin can add members
        if (!group.isOwnerOrAdmin(currentUserId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(groupService.addMember(groupId, userId, role));
    }

    @DeleteMapping("/{groupId}/members/{userId}")
    public ResponseEntity<Group> removeMember(
            @PathVariable String groupId,
            @PathVariable String userId,
            @RequestHeader("userId") String currentUserId) {
        Group group = groupService.getGroupById(groupId);

        // Only owner or admin can remove members, or a user can remove themselves
        if (!group.isOwnerOrAdmin(currentUserId) && !currentUserId.equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(groupService.removeMember(groupId, userId));
    }

    @PutMapping("/{groupId}/members/{userId}/role")
    public ResponseEntity<Group> updateMemberRole(
            @PathVariable String groupId,
            @PathVariable String userId,
            @RequestBody MemberRoleUpdateDto roleUpdateDto,
            @RequestHeader("userId") String currentUserId) {
        Group group = groupService.getGroupById(groupId);

        // Only owner can change roles
        if (!group.isOwner(currentUserId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(groupService.updateMemberRole(groupId, userId, roleUpdateDto.getRole()));
    }
}
