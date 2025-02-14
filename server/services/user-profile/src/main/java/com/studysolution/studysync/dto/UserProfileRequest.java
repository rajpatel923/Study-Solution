package com.studysolution.studysync.dto;


import lombok.Data;

import java.util.HashMap;
import java.util.Map;


public record UserProfileRequest(
    String firstName,
    String lastName,
    String bio,
    String userId,
    //todo figure out the metadata tag config
    Map<String, Object> metadata
)
{

}