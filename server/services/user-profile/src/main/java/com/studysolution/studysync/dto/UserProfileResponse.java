package com.studysolution.studysync.dto;

import lombok.*;

import java.util.HashMap;
import java.util.Map;

@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UserProfileResponse{

    private String firstName;
    private String lastName;
    private String bio;
    private String userId;
    private Map<String, Object> metaData = new HashMap<>();
}
