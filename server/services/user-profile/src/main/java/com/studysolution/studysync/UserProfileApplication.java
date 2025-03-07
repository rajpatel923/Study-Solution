package com.studysolution.studysync;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication
@EnableDiscoveryClient
public class UserProfileApplication {

	public static void main(String[] args) {
		SpringApplication.run(UserProfileApplication.class, args);
	}

}
