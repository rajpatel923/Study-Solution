package com.studysolution.studysync.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.validator.constraints.UniqueElements;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.*;

@Document(collection = "UserProfile")
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UserProfile {

    @Field("_id")
    @Id
    @MongoId(FieldType.OBJECT_ID)
    private String id;

    @Indexed(unique = true)
    @NotBlank
    @NotNull
    @NotEmpty
    private String userId;

    private String firstName;
    private String lastName;
    private String bio;
}
