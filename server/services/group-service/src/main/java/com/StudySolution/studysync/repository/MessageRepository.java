package com.StudySolution.studysync.repository;

import com.StudySolution.studysync.DTO.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;


@Repository
public interface MessageRepository extends MongoRepository<Message, String> {
    Page<Message> findByGroupIdOrderBySentAtDesc(String groupId, Pageable pageable);
}