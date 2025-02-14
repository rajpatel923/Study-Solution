package com.studysolution.studysync.dto;

import java.util.Map;

public record UserProfileResponse(
        String userId,
        String firstName,
        String lastName,
        String bio,
        Map<String, Object> metadata
) {
}
