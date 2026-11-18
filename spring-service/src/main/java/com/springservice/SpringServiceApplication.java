package com.springservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableFeignClients(basePackages = "com.springservice.payment.client")
public class SpringServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(SpringServiceApplication.class, args);
	}

}
