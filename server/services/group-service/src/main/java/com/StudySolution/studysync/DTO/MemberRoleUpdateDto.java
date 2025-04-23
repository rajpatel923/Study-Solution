package com.StudySolution.studysync.DTO;

import com.StudySolution.studysync.model.enums.GroupMemberRole;

public class MemberRoleUpdateDto {
    private GroupMemberRole role;

    // Getters and Setters
    public GroupMemberRole getRole() {
        return role;
    }

    public void setRole(GroupMemberRole role) {
        this.role = role;
    }
}