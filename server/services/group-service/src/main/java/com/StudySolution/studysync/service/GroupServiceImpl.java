package com.StudySolution.studysync.service;

import com.StudySolution.studysync.exception.ResourceNotFoundException;
import com.StudySolution.studysync.exception.UnauthorizedException;
import com.StudySolution.studysync.model.Group;
import com.StudySolution.studysync.model.enums.GroupMemberRole;
import com.StudySolution.studysync.repository.GroupRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class GroupServiceImpl implements GroupService {

    private final GroupRepository groupRepository;

    @Autowired
    public GroupServiceImpl(GroupRepository groupRepository) {
        this.groupRepository = groupRepository;
    }

    @Override
    public Group createGroup(Group group) {
        group.setCreatedAt(LocalDateTime.now());
        return groupRepository.save(group);
    }

    @Override
    public Group getGroupById(String groupId) {
        return groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found with id: " + groupId));
    }

    @Override
    public List<Group> getGroupsByUserId(String userId) {
        return groupRepository.findByMembersUserId(userId);
    }

    @Override
    public Group updateGroup(String groupId, Group updatedGroup) {
        Group group = getGroupById(groupId);

        // Only owner or admin can update the group
        if (!group.isOwnerOrAdmin(updatedGroup.getOwnerId())) {
            throw new UnauthorizedException("Only group owner or admin can update the group");
        }

        // Update fields that are allowed to be updated
        group.setName(updatedGroup.getName());
        group.setDescription(updatedGroup.getDescription());
        group.setAvatarUrl(updatedGroup.getAvatarUrl());
        group.setSettings(updatedGroup.getSettings());

        return groupRepository.save(group);
    }

    @Override
    public void deleteGroup(String groupId) {
        Group group = getGroupById(groupId);
        groupRepository.delete(group);
    }

    @Override
    public Group addMember(String groupId, String userId, GroupMemberRole role) {
        Group group = getGroupById(groupId);
        group.addMember(userId, role);
        return groupRepository.save(group);
    }

    @Override
    public Group removeMember(String groupId, String userId) {
        Group group = getGroupById(groupId);

        // Cannot remove the owner
        if (group.getOwnerId().equals(userId)) {
            throw new UnauthorizedException("Cannot remove the owner from the group");
        }

        group.removeMember(userId);
        return groupRepository.save(group);
    }

    @Override
    public Group updateMemberRole(String groupId, String userId, GroupMemberRole role) {
        Group group = getGroupById(groupId);

        // Cannot change the role of the owner
        if (group.getOwnerId().equals(userId)) {
            throw new UnauthorizedException("Cannot change the role of the group owner");
        }

        group.updateMemberRole(userId, role);
        return groupRepository.save(group);
    }

    @Override
    public boolean isUserMemberOfGroup(String groupId, String userId) {
        Group group = getGroupById(groupId);
        return group.isMember(userId);
    }

    @Override
    public boolean canUserShareInGroup(String groupId, String userId) {
        Group group = getGroupById(groupId);

        // Owner and admins can always share
        if (group.isOwnerOrAdmin(userId)) {
            return true;
        }

        // Regular members can share if allowed by group settings
        return group.isMember(userId) && group.getSettings().isAllowMemberSharing();
    }
}