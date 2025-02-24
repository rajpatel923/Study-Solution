package com.studysolution.studysync.util;

import com.studysolution.studysync.dto.UserProfileRequest;
import com.studysolution.studysync.dto.UserProfileResponse;
import com.studysolution.studysync.model.UserProfile;
import com.studysolution.studysync.repository.UserProfileRepository;
import com.studysolution.studysync.service.UserProfileService;
import lombok.AllArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class UserProfileServiceImple implements UserProfileService {


    private final UserProfileRepository userProfileRepository;
    private final UserProfileMapper userProfileMapper;

    @Autowired
    public UserProfileServiceImple(UserProfileRepository userProfileRepository, UserProfileMapper userProfileMapper){
        this.userProfileRepository = userProfileRepository;
        this.userProfileMapper = userProfileMapper;
    }


    @Override
    public UserProfile createUserProfile(UserProfileRequest request) {
        return userProfileRepository.save(userProfileMapper.toUserProfile(request));
    }
}
