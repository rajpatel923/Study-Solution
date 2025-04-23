package com.StudySolution.studysync.repository;

import com.StudySolution.studysync.model.Group;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GroupRepository extends MongoRepository<Group, String> {
    List<Group> findByMembersUserId(String userId);
    List<Group> findByOwnerId(String ownerId);
}