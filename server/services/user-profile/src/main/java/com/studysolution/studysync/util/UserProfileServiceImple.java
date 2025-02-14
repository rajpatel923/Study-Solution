package com.studysolution.studysync.util;

import com.studysolution.studysync.dto.UserProfileRequest;
import com.studysolution.studysync.model.UserProfile;
import com.studysolution.studysync.repository.UserProfileRepository;
import com.studysolution.studysync.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserProfileServiceImple implements UserProfileService {
    private final UserProfileRepository userProfileRepository;
    private final UserProfileMapper userProfileMapper;

    @Override
    public UserProfile createUserProfile(UserProfileRequest request) {
        var userProfile = userProfileRepository.save(userProfileMapper.toUserProfile(request));
        return userProfile;
    }
}
