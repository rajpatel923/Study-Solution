package com.studysolution.studysync.controller;

import com.studysolution.studysync.dto.UserProfileRequest;
import com.studysolution.studysync.model.UserProfile;
import com.studysolution.studysync.repository.UserProfileRepository;
import com.studysolution.studysync.service.UserProfileService;
import com.studysolution.studysync.util.ResponseHandler;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/userprofile")
public class UserProfileController {
    private final UserProfileService service;

    @PostMapping
    public ResponseEntity<Object> createUserProfile(@RequestBody @Valid UserProfileRequest request){
        // passing request to service
        // service will imple and save the data to database
        // this will return user information saved (user profile back)
        // take that user profile send to user
        try {
            UserProfile userProfile = this.service.createUserProfile(request);
            return ResponseHandler.generateResponse("User profile is successfully created", HttpStatus.OK, userProfile);
        }catch (Exception e){
            return ResponseHandler.generateResponse(e.getMessage(), HttpStatus.MULTI_STATUS, null);
        }
    }


}
