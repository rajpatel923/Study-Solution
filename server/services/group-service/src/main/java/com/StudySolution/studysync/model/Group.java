package com.StudySolution.studysync.model;

import com.StudySolution.studysync.model.enums.GroupMemberRole;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Document(collection = "groups")
public class Group {

    @Id
    private String id;
    private String name;
    private String description;
    private LocalDateTime createdAt;
    private String ownerId;
    private List<GroupMember> members = new ArrayList<>();
    private String avatarUrl;
    private GroupSettings settings;

    public boolean isMember(String userId) {
        return members.stream().anyMatch(member -> member.getUserId().equals(userId));
    }

    public GroupMember getMember(String userId) {
        return members.stream()
                .filter(member -> member.getUserId().equals(userId))
                .findFirst()
                .orElse(null);
    }

    public Group(String name, String description, String ownerId) {
        this.name = name;
        this.description = description;
        this.ownerId = ownerId;
        this.createdAt = LocalDateTime.now();
        this.settings = new GroupSettings();
        // Add owner as the first member with OWNER role
        this.members.add(new GroupMember(ownerId, GroupMemberRole.OWNER, LocalDateTime.now()));
    }

    public boolean isOwnerOrAdmin(String userId) {
        GroupMember member = getMember(userId);
        return member != null &&
                (member.getRole() == GroupMemberRole.OWNER || member.getRole() == GroupMemberRole.ADMIN);
    }

    public boolean isOwner(String userId) {
        return ownerId.equals(userId);
    }

    public void addMember(String userId, GroupMemberRole role) {
        if (!isMember(userId)) {
            members.add(new GroupMember(userId, role, LocalDateTime.now()));
        }
    }

    public void removeMember(String userId) {
        members.removeIf(member -> member.getUserId().equals(userId));
    }

    public void updateMemberRole(String userId, GroupMemberRole role) {
        GroupMember member = getMember(userId);
        if (member != null) {
            member.setRole(role);
        }
    }

}
