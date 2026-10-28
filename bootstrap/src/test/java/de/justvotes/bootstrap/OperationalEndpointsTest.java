package de.justvotes.bootstrap;

import de.justvotes.accountmanagement.core.ports.out.InvitationMailer;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.nio.file.Path;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
class OperationalEndpointsTest {
    static final Path databasePath = Path.of("target", "operational-" + UUID.randomUUID() + ".db");
    @LocalServerPort
    int port;
    @Autowired
    ApplicationContext context;

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:sqlite:" + databasePath);
        registry.add("ADMIN_USERNAME", () -> "systemadmin");
        registry.add("ADMIN_PASSWORD_HASH", () -> "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy");
    }

    @Test
    void exposesHealthAndReadinessAfterMigratingTheDatabase() {
        TestRestTemplate client = new TestRestTemplate();

        ResponseEntity<String> health = client.getForEntity("http://localhost:" + port + "/actuator/health", String.class);
        ResponseEntity<String> readiness = client.getForEntity("http://localhost:" + port + "/actuator/health/readiness", String.class);

        assertThat(health.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(readiness.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(databasePath).exists();
    }

    @Test
    void staysHealthyWithoutAMailServer() {
        ResponseEntity<String> health = new TestRestTemplate().getForEntity("http://localhost:" + port + "/actuator/health", String.class);

        assertThat(health.getBody()).contains("\"status\":\"UP\"");
        assertThat(context.getBeanNamesForType(JavaMailSender.class)).isEmpty();
        assertThat(context.getBean(InvitationMailer.class).isAvailable()).isFalse();
    }
}
