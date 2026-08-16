package de.justvotes.bootstrap;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class JustVotesApplication {
    public static void main(String[] args) {
        SpringApplication.run(JustVotesApplication.class, args);
    }
}
