package de.justvotes.bootstrap;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.nio.file.Path;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class SpaFallbackHttpTest {
    private static final Path DATABASE_PATH = Path.of("target", "spa-fallback-" + UUID.randomUUID() + ".db");

    @LocalServerPort
    int port;

    @DynamicPropertySource
    static void applicationProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:sqlite:" + DATABASE_PATH);
        registry.add("ADMIN_USERNAME", () -> "systemadmin");
        registry.add("ADMIN_PASSWORD_HASH", () -> "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy");
    }

    @Test
    void servesSpaForRootAndClientRoutesButNotBackendRoutes() {
        TestRestTemplate client = new TestRestTemplate();
        String baseUrl = "http://localhost:" + port;

        ResponseEntity<String> root = client.getForEntity(baseUrl + "/", String.class);
        ResponseEntity<String> clientRoute = client.getForEntity(baseUrl + "/poll/example", String.class);
        ResponseEntity<String> staticFile = client.getForEntity(baseUrl + "/index.html", String.class);
        ResponseEntity<String> missingAsset = client.getForEntity(baseUrl + "/assets/missing.js", String.class);
        ResponseEntity<String> missingApiRoot = client.getForEntity(baseUrl + "/api", String.class);
        ResponseEntity<String> missingApi = client.getForEntity(baseUrl + "/api/v1/missing", String.class);
        ResponseEntity<String> missingActuator = client.getForEntity(baseUrl + "/actuator/missing", String.class);

        assertThat(root.getStatusCode().value()).isEqualTo(200);
        assertThat(clientRoute.getStatusCode().value()).isEqualTo(200);
        assertThat(staticFile.getStatusCode().value()).isEqualTo(200);
        assertThat(staticFile.getHeaders().getContentType()).isEqualTo(MediaType.TEXT_HTML);
        assertThat(clientRoute.getBody()).isEqualTo(root.getBody());
        assertThat(missingAsset.getStatusCode().value()).isEqualTo(404);
        assertThat(missingApiRoot.getStatusCode().value()).isEqualTo(404);
        assertThat(missingApi.getStatusCode().value()).isEqualTo(404);
        assertThat(missingActuator.getStatusCode().value()).isEqualTo(404);
    }
}
