package com.studysolution.studysync;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication
@EnableDiscoveryClient
public class GatewayServiceApplication {

	public static void main(String[] args) {
		Dotenv dotenv = Dotenv
				.load();
		System.setProperty("JWT_SECRET", dotenv.get("JWT_SECRET"));
		System.setProperty("JWT_ACCESS_TOKEN_EXPIRATION", dotenv.get("JWT_ACCESS_TOKEN_EXPIRATION"));
		System.setProperty("JWT_REFERESH_TOKEN_EXPIRATION", dotenv.get("JWT_REFERESH_TOKEN_EXPIRATION"));
		SpringApplication.run(GatewayServiceApplication.class, args);
	}

}
