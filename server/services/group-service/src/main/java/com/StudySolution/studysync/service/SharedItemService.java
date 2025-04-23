package com.StudySolution.studysync.service;

import com.StudySolution.studysync.model.SharedItem;
import com.StudySolution.studysync.model.enums.AccessType;
import com.StudySolution.studysync.model.enums.ItemType;

import java.util.List;

public interface SharedItemService {
    SharedItem shareItem(String groupId, String itemId, ItemType itemType, String userId,
                         String title, String description, AccessType accessType);
    List<SharedItem> getSharedItemsByGroupId(String groupId);
    SharedItem getSharedItemById(String sharedItemId);
    void removeSharedItem(String sharedItemId, String userId);
    boolean isItemSharedInGroup(String groupId, String itemId, ItemType itemType);
    List<SharedItem> getGroupsWhereItemIsShared(String itemId, ItemType itemType);
}
