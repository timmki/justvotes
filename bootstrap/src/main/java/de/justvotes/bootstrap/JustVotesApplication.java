package de.justvotes.bootstrap;

import de.justvotes.adapters.shared.infra.in.http.ApiExceptionHandler;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Import;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@Import(ApiExceptionHandler.class)
public class JustVotesApplication {
    public static void main(String[] args) {
        SpringApplication.run(JustVotesApplication.class, args);
    }
}
