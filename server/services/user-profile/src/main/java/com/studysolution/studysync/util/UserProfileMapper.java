package com.studysolution.studysync.util;

import com.studysolution.studysync.dto.UserProfileRequest;
import com.studysolution.studysync.dto.UserProfileResponse;
import com.studysolution.studysync.model.UserMetaData;
import com.studysolution.studysync.model.UserProfile;
import org.springframework.stereotype.Component;

@Component
public class UserProfileMapper {
    public UserProfile toUserProfile(UserProfileRequest request){
        if (request == null) return null;
        UserMetaData userMetaData = UserMetaData.builder()
                .userId(request.userId())
                .metadata(request.metadata())
                .build();
        return UserProfile.builder()
                .userId(request.userId())
                .firstName(request.firstName())
                .lastName(request.lastName())
                .bio(request.bio())
                .metaData(userMetaData)
                .build();
    }
}
