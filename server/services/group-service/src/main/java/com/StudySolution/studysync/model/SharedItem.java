package com.StudySolution.studysync.model;


import com.StudySolution.studysync.model.enums.AccessType;
import com.StudySolution.studysync.model.enums.ItemType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "shared_items")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class SharedItem {
    @Id
    private String id;
    private String groupId;
    private String itemId;
    private ItemType itemType;
    private String sharedBy;
    private LocalDateTime sharedAt;
    private String title;
    private String description;
    private AccessType accessType;
    private LocalDateTime expiresAt;

    public SharedItem(String groupId, String itemId, ItemType itemType, String sharedBy,
                      String title, String description, AccessType accessType) {
        this.groupId = groupId;
        this.itemId = itemId;
        this.itemType = itemType;
        this.sharedBy = sharedBy;
        this.sharedAt = LocalDateTime.now();
        this.title = title;
        this.description = description;
        this.accessType = accessType;
    }
}