package com.studysolution.studysync.service;

import com.studysolution.studysync.dto.UserProfileRequest;
import com.studysolution.studysync.dto.UserProfileResponse;
import com.studysolution.studysync.model.UserProfile;

import java.util.List;

public interface UserProfileService {
    UserProfile createUserProfile(UserProfileRequest request);


    UserProfileResponse getUserProfileById(String userId);

    UserProfileResponse updateUserProfile(String userId, UserProfileRequest request);
}
