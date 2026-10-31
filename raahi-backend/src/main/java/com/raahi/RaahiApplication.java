package com.raahi;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@SpringBootApplication
@EnableJpaRepositories(basePackages = "com.raahi.repository.sql")
@EnableMongoRepositories(basePackages = "com.raahi.repository.mongo")
public class RaahiApplication {

    public static void main(String[] args) {
        SpringApplication.run(RaahiApplication.class, args);
    }
}

