package com.studysolution.studysync.util;

import com.studysolution.studysync.dto.UserProfileRequest;
import com.studysolution.studysync.model.UserMetaData;
import org.springframework.stereotype.Component;

@Component
public class UserMetaDataMapper {
    public UserMetaData toUserMetaData(UserProfileRequest request) {
        if (request == null) {
            return null;
        }

        UserMetaData userMetaData = UserMetaData.builder()
                .userId(request.userId())
                .metadata(request.metadata())
                .build();
        return userMetaData;
    }
}
