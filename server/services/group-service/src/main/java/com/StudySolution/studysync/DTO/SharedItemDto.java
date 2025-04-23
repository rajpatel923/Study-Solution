package com.StudySolution.studysync.DTO;

import com.StudySolution.studysync.model.enums.AccessType;
import com.StudySolution.studysync.model.enums.ItemType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Data
public class SharedItemDto {
    private String itemId;
    private ItemType itemType;
    private String title;
    private String description;
    private AccessType accessType;

}
