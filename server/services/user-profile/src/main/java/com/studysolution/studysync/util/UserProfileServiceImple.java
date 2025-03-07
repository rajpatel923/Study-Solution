package com.studysolution.studysync.util;

import com.studysolution.studysync.dto.UserProfileRequest;
import com.studysolution.studysync.dto.UserProfileResponse;
import com.studysolution.studysync.model.UserMetaData;
import com.studysolution.studysync.model.UserProfile;
import com.studysolution.studysync.repository.UserMetaDataRepository;
import com.studysolution.studysync.repository.UserProfileRepository;
import com.studysolution.studysync.service.UserProfileService;
import lombok.AllArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.apache.catalina.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.swing.text.html.Option;
import java.util.List;
import java.util.Optional;

@Service
public class UserProfileServiceImple implements UserProfileService {


    private final UserProfileRepository userProfileRepository;
    private final UserProfileMapper userProfileMapper;
    private final UserMetaDataRepository userMetaDataRepository;
    private final UserMetaDataMapper userMetaDataMapper;

    @Autowired
    public UserProfileServiceImple(UserProfileRepository userProfileRepository, UserProfileMapper userProfileMapper, UserMetaDataRepository userMetaDataRepository, UserMetaDataMapper userMetaDataMapper){
        this.userProfileRepository = userProfileRepository;
        this.userProfileMapper = userProfileMapper;
        this.userMetaDataRepository = userMetaDataRepository;
        this.userMetaDataMapper = userMetaDataMapper;
    }


    @Override
    public UserProfile createUserProfile(UserProfileRequest request) {
        // save metadata first
        // then save userProfile information
        userMetaDataRepository.save(userMetaDataMapper.toUserMetaData(request));

        Optional<UserProfile> userProfile = userProfileRepository.findByUserId(request.userId());
        if (userProfile.isPresent()) {
            //todo return response error
            return null;
        }
        return userProfileRepository.save(userProfileMapper.toUserProfile(request));
    }

    @Override
    public UserProfileResponse getUserProfileById(String userId) {

        UserProfile userProfile = userProfileRepository.findByUserId(userId).orElse(null);
        if (userProfile == null) {return null;}


        UserMetaData userMetaData = userMetaDataRepository.findByUserId(userId).orElse(null);
        if (userMetaData == null) {return null;}

        UserProfileResponse userProfileResponse = UserProfileResponse.builder()
                .firstName(userProfile.getFirstName())
                .lastName(userProfile.getLastName())
                .userId(userProfile.getUserId())
                .bio(userProfile.getBio())
                .metaData(userMetaData.getMetadata())
                .build();
        return userProfileResponse;
    }

    @Override
    public UserProfileResponse updateUserProfile(String userId, UserProfileRequest request ) {
        //first, get the user from database 
        // change fields that are changed 
        Optional<UserProfile> userProfile = userProfileRepository.findByUserId(userId);
        if (userProfile.isEmpty()) {return null;}
        
        Optional<UserMetaData> userMetaData = userMetaDataRepository.findByUserId(userId);


        if(!request.firstName().isEmpty()){
            userProfile.get().setFirstName(request.firstName());
        } else if (!request.lastName().isEmpty()) {
            userProfile.get().setLastName(request.lastName());
        } else if (request.bio().isEmpty()) {
            userProfile.get().setBio(request.bio());
        }
        userProfileRepository.save(userProfile.get());

        return UserProfileResponse.builder()
                .firstName(userProfile.get().getFirstName())
                .lastName(userProfile.get().getLastName())
                .userId(userProfile.get().getUserId())
                .bio(userProfile.get().getBio())
                .metaData(userMetaData.get().getMetadata())
                .build();
    }

}
