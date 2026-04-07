package com.sante.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties
public class SanteApplication {

    public static void main(String[] args) {
        SpringApplication.run(SanteApplication.class, args);
    }
}
