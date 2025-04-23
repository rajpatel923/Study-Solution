package com.StudySolution.studysync.repository;

import com.StudySolution.studysync.model.SharedItem;
import com.StudySolution.studysync.model.enums.ItemType;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SharedItemRepository extends MongoRepository<SharedItem, String> {
    List<SharedItem> findByGroupId(String groupId);
    Optional<SharedItem> findByGroupIdAndItemIdAndItemType(String groupId, String itemId, ItemType itemType);
    List<SharedItem> findByItemIdAndItemType(String itemId, ItemType itemType);
}