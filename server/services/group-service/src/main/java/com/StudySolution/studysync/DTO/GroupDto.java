package com.StudySolution.studysync.DTO;

import com.StudySolution.studysync.model.GroupSettings;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Data
public class GroupDto {
    private String name;
    private String description;
    private String avatarUrl;
    private GroupSettings settings;
}
