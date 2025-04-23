package com.StudySolution.studysync.model;

import com.StudySolution.studysync.model.enums.GroupMemberRole;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class GroupMember {
    private String userId;
    private GroupMemberRole role;
    private LocalDateTime joinedAt;
}
