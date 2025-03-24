package com.StudySolution.studysync.config;


import com.azure.storage.blob.BlobContainerClient;
import com.azure.storage.blob.BlobServiceClient;
import com.azure.storage.blob.BlobServiceClientBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AzureStorageConfig {

    private final StudySyncAzureStorageProperties azureStorageProperties;

    public AzureStorageConfig(StudySyncAzureStorageProperties azureStorageProperties) {
        this.azureStorageProperties = azureStorageProperties;
    }

    @Bean
    public BlobServiceClient blobServiceClient() {
        return new BlobServiceClientBuilder()
                .connectionString(azureStorageProperties.getConnectionString())
                .buildClient();
    }

    @Bean
    public BlobContainerClient blobContainerClient(BlobServiceClient blobServiceClient) {
        BlobContainerClient containerClient = blobServiceClient
                .getBlobContainerClient(azureStorageProperties.getContainerName());

        if (!containerClient.exists()) {
            containerClient.create();
        }

        return containerClient;
    }
}