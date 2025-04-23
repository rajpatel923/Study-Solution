package com.StudySolution.studysync.service;

import com.StudySolution.studysync.client.DocumentServiceClient;
import com.StudySolution.studysync.client.FlashcardSetServiceClient;
import com.StudySolution.studysync.client.SummaryServiceClient;
import com.StudySolution.studysync.exception.ResourceNotFoundException;
import com.StudySolution.studysync.exception.UnauthorizedException;
import com.StudySolution.studysync.model.SharedItem;
import com.StudySolution.studysync.model.enums.AccessType;
import com.StudySolution.studysync.model.enums.ItemType;
import com.StudySolution.studysync.repository.SharedItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SharedItemServiceImpl implements SharedItemService {

    private final SharedItemRepository sharedItemRepository;
    private final GroupService groupService;
    private final DocumentServiceClient documentServiceClient;
    private final SummaryServiceClient summaryServiceClient;
    private final FlashcardSetServiceClient flashcardSetServiceClient;

    @Autowired
    public SharedItemServiceImpl(
            SharedItemRepository sharedItemRepository,
            GroupService groupService,
            DocumentServiceClient documentServiceClient,
            SummaryServiceClient summaryServiceClient,
            FlashcardSetServiceClient flashcardSetServiceClient) {
        this.sharedItemRepository = sharedItemRepository;
        this.groupService = groupService;
        this.documentServiceClient = documentServiceClient;
        this.summaryServiceClient = summaryServiceClient;
        this.flashcardSetServiceClient = flashcardSetServiceClient;
    }

    @Override
    public SharedItem shareItem(String groupId, String itemId, ItemType itemType, String userId,
                                String title, String description, AccessType accessType) {
        // Check if user can share in this group
        if (!groupService.canUserShareInGroup(groupId, userId)) {
            throw new UnauthorizedException("User is not allowed to share items in this group");
        }

        // Verify that the item exists and user has access to it
        verifyItemAccess(itemId, itemType, userId);

        // Check if the item is already shared in the group
        if (isItemSharedInGroup(groupId, itemId, itemType)) {
            throw new IllegalArgumentException("Item is already shared in this group");
        }

        // Create and save the shared item
        SharedItem sharedItem = new SharedItem(groupId, itemId, itemType, userId, title, description, accessType);
        return sharedItemRepository.save(sharedItem);
    }

    @Override
    public List<SharedItem> getSharedItemsByGroupId(String groupId) {
        return sharedItemRepository.findByGroupId(groupId);
    }

    @Override
    public SharedItem getSharedItemById(String sharedItemId) {
        return sharedItemRepository.findById(sharedItemId)
                .orElseThrow(() -> new ResourceNotFoundException("Shared item not found with id: " + sharedItemId));
    }

    @Override
    public void removeSharedItem(String sharedItemId, String userId) {
        SharedItem sharedItem = getSharedItemById(sharedItemId);

        // Only the user who shared the item or a group owner/admin can remove it
        if (!sharedItem.getSharedBy().equals(userId) &&
                !groupService.getGroupById(sharedItem.getGroupId()).isOwnerOrAdmin(userId)) {
            throw new UnauthorizedException("User is not allowed to remove this shared item");
        }

        sharedItemRepository.delete(sharedItem);
    }

    @Override
    public boolean isItemSharedInGroup(String groupId, String itemId, ItemType itemType) {
        return sharedItemRepository.findByGroupIdAndItemIdAndItemType(groupId, itemId, itemType).isPresent();
    }

    @Override
    public List<SharedItem> getGroupsWhereItemIsShared(String itemId, ItemType itemType) {
        return sharedItemRepository.findByItemIdAndItemType(itemId, itemType);
    }

    // Helper method to verify that the item exists and user has access to it
    private void verifyItemAccess(String itemId, ItemType itemType, String userId) {
        try {
            switch (itemType) {
                case DOCUMENT:
                    documentServiceClient.getDocument(itemId, userId);
                    break;
                case SUMMARY:
                    summaryServiceClient.getSummary(itemId, userId);
                    break;
                case FLASHCARD_SET:
                    flashcardSetServiceClient.getFlashcardSet(itemId, userId);
                    break;
                default:
                    throw new IllegalArgumentException("Unsupported item type: " + itemType);
            }
        } catch (Exception e) {
            throw new UnauthorizedException("User does not have access to the item or item does not exist");
        }
    }
}