package com.studysolution.studysync.repository;

import com.studysolution.studysync.model.UserMetaData;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserMetaDataRepository extends MongoRepository<UserMetaData, String> {
    Optional<UserMetaData> findByUserId(String userId);
}
