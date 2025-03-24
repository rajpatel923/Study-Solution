package com.StudySolution.studysync.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "azure.storage")
@Data
public class StudySyncAzureStorageProperties {
    private String connectionString;
    private String containerName;
    private String baseUrl;
}
