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
		System.setProperty("FRONTEND_URL", dotenv.get("FRONTEND_URL"));

		System.setProperty("GOOGLE_AUTH_CLIENT_ID", dotenv.get("GOOGLE_AUTH_CLIENT_ID"));
		System.setProperty("GOOGLE_AUTH_CLIENT_SECRET", dotenv.get("GOOGLE_AUTH_CLIENT_SECRET"));

		System.setProperty("GITHUB_AUTH_CLIENT_ID", dotenv.get("GITHUB_AUTH_CLIENT_ID"));
		System.setProperty("GITHUB_AUTH_CLIENT_SECRET", dotenv.get("GITHUB_AUTH_CLIENT_SECRET"));

		System.setProperty("FACEBOOK_AUTH_CLIENT_ID", dotenv.get("FACEBOOK_AUTH_CLIENT_ID"));
		System.setProperty("FACEBOOK_AUTH_CLIENT_SECRET", dotenv.get("FACEBOOK_AUTH_CLIENT_SECRET"));

		System.setProperty("APPLE_AUTH_CLIENT_ID", dotenv.get("APPLE_AUTH_CLIENT_ID"));
		System.setProperty("APPLE_AUTH_CLIENT_SECRET", dotenv.get("APPLE_AUTH_CLIENT_SECRET"));
		System.setProperty("APPLE_AUTH_TEAM_ID", dotenv.get("APPLE_AUTH_TEAM_ID"));
		System.setProperty("APPLE_AUTH_KEY_ID", dotenv.get("APPLE_AUTH_KEY_ID"));
		System.setProperty("APPLE_AUTH_KEY_PATH", dotenv.get("APPLE_AUTH_KEY_PATH"));
		SpringApplication.run(GatewayServiceApplication.class, args);
	}

}
