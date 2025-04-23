package com.StudySolution.studysync.model;

import com.StudySolution.studysync.model.enums.GroupVisibility;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class GroupSettings {
    private GroupVisibility visibility;
    private boolean allowMemberSharing;
}
