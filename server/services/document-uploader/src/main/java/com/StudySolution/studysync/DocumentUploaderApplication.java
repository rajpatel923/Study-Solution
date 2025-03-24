package com.StudySolution.studysync;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableDiscoveryClient
@EnableFeignClients
public class DocumentUploaderApplication {

	public static void main(String[] args) {

		Dotenv dotenv = Dotenv
				.load();

		System.setProperty("DB_HOST", dotenv.get("DB_HOST"));
		System.setProperty("DB_PORT", dotenv.get("DB_PORT"));
		System.setProperty("DB_NAME", dotenv.get("DB_NAME"));
		System.setProperty("DB_USERNAME", dotenv.get("DB_USERNAME"));
		System.setProperty("DB_PASSWORD", dotenv.get("DB_PASSWORD"));

		System.setProperty("AZURE_STORAGE_BASE_URL", dotenv.get("AZURE_STORAGE_BASE_URL"));
		System.setProperty("AZURE_STORAGE_CONNECTION_STRING", dotenv.get("AZURE_STORAGE_CONNECTION_STRING"));

		System.setProperty("EUREKA_SERVER_URL",dotenv.get("EUREKA_SERVER_URL"));
		System.setProperty("CONFIG_SERVER_URL", dotenv.get("CONFIG_SERVER_URL"));


		SpringApplication.run(DocumentUploaderApplication.class, args);
	}

}
