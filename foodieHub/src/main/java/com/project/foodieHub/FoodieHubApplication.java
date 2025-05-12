package com.project.foodieHub;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class FoodieHubApplication {

	public static void main(String[] args) {
		SpringApplication.run(FoodieHubApplication.class, args);
	}

}
