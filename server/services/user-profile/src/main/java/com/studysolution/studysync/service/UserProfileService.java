package com.studysolution.studysync.service;

import com.studysolution.studysync.dto.UserProfileRequest;
import com.studysolution.studysync.model.UserProfile;

public interface UserProfileService {
    UserProfile createUserProfile(UserProfileRequest request);
}
