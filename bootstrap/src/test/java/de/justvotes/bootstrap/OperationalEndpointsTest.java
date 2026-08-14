package de.justvotes.bootstrap;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.nio.file.Path;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class OperationalEndpointsTest {
    static final Path databasePath = Path.of("target", "operational-" + UUID.randomUUID() + ".db");
    @LocalServerPort
    int port;

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:sqlite:" + databasePath);
        registry.add("ADMIN_USERNAME", () -> "systemadmin");
        registry.add("ADMIN_PASSWORD_HASH", () -> "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy");
    }

    @Test
    void exposesHealthAndReadinessAfterMigratingTheDatabase() {
        var client = new TestRestTemplate();

        ResponseEntity<String> health = client.getForEntity("http://localhost:" + port + "/actuator/health", String.class);
        ResponseEntity<String> readiness = client.getForEntity("http://localhost:" + port + "/actuator/health/readiness", String.class);

        assertThat(health.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(readiness.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(databasePath).exists();
    }
}
