package com.studysolution.studysync.controller;

import com.studysolution.studysync.dto.UserProfileRequest;
import com.studysolution.studysync.dto.UserProfileResponse;
import com.studysolution.studysync.model.UserProfile;
import com.studysolution.studysync.repository.UserProfileRepository;
import com.studysolution.studysync.service.UserProfileService;
import com.studysolution.studysync.util.ResponseHandler;
import com.studysolution.studysync.util.UserProfileMapper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/")
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

    @GetMapping("/{userId}")
    public ResponseEntity<Object> findAllUserProfiles(@PathVariable String userId){
        try {
            UserProfileResponse userProfile = this.service.getUserProfileById(userId);
            return ResponseHandler.generateResponse("user profile is successfully fetch", HttpStatus.OK, userProfile);
        }
        catch (Exception e){
            return ResponseHandler.generateResponse(e.getMessage(), HttpStatus.MULTI_STATUS, null);
        }
    }

    @PutMapping("/{userId}")
    public ResponseEntity<Object> updateUserProfile(@PathVariable String userId, @RequestBody UserProfileRequest request){
        try{
            UserProfileResponse userProfile = this.service.updateUserProfile(userId, request);
            return ResponseHandler.generateResponse("user profile is successfully updated", HttpStatus.OK, userProfile);
        }catch (Exception e){
            return ResponseHandler.generateResponse(e.getMessage(), HttpStatus.MULTI_STATUS, null);
        }
    }


}
