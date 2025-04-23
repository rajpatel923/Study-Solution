package com.StudySolution.studysync.service;

import com.StudySolution.studysync.model.Group;
import com.StudySolution.studysync.model.enums.GroupMemberRole;

import java.util.List;

public interface GroupService {
    Group createGroup(Group group);
    Group getGroupById(String groupId);
    List<Group> getGroupsByUserId(String userId);
    Group updateGroup(String groupId, Group group);
    void deleteGroup(String groupId);
    Group addMember(String groupId, String userId, GroupMemberRole role);
    Group removeMember(String groupId, String userId);
    Group updateMemberRole(String groupId, String userId, GroupMemberRole role);
    boolean isUserMemberOfGroup(String groupId, String userId);
    boolean canUserShareInGroup(String groupId, String userId);
}
