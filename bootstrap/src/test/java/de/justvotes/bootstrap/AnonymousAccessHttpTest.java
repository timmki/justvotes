package de.justvotes.bootstrap;

import de.justvotes.bootstrap.support.AccountHttpTestBase;
import de.justvotes.bootstrap.support.TestSession;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.nio.file.Path;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
class AnonymousAccessHttpTest extends AccountHttpTestBase {
    private static final Path DATABASE_PATH = Path.of("target", "anonymous-" + UUID.randomUUID() + ".db");

    @DynamicPropertySource
    static void applicationProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:sqlite:" + DATABASE_PATH);
        registry.add("ADMIN_USERNAME", () -> "systemadmin");
        registry.add("ADMIN_PASSWORD_HASH", () -> new BCryptPasswordEncoder().encode("password"));
        registry.add("justvotes.api-docs.enabled", () -> "true");
    }

    @Test
    void revealsNoApplicationDataWithoutASession() {
        TestSession anonymous = fixtures().anonymous();
        for (String path : List.of("/polls", "/polls/p_v1_missing", "/polls/p_v1_missing/results", "/polls/p_v1_missing/audit",
                "/identity/votes", "/session", "/admin/polls", "/admin/votes", "/admin/accounts", "/admin/invitations",
                "/admin/template-catalog/templates", "/unknown")) {
            assertProblem(anonymous.get(url(path)), 401, "authentication-required");
        }
        assertProblem(anonymous.post(url("/polls/p_v1_missing/votes"), "{\"optionNumber\":1}"), 401, "authentication-required");
        assertProblem(anonymous.post(url("/session/logout")), 401, "authentication-required");
    }

    @Test
    void keepsLoginInvitationAndTechnicalEndpointsReachable() {
        TestRestTemplate client = new TestRestTemplate();
        String origin = "http://localhost:" + port;
        assertThat(client.getForEntity(origin + "/api/v1/csrf", String.class).getStatusCode().value()).isEqualTo(200);
        assertThat(client.getForEntity(origin + "/actuator/health", String.class).getStatusCode().value()).isEqualTo(200);
        assertThat(client.getForEntity(origin + "/config.js", String.class).getStatusCode().value()).isEqualTo(200);
        assertThat(client.getForEntity(origin + "/polls", String.class).getStatusCode().value()).isEqualTo(200);
        TestSession anonymous = fixtures().anonymous();
        assertProblem(anonymous.post(url("/invitations/inspection"), "{\"token\":\"unknown\"}"), 409, "invitation-not-usable");
    }

    @Test
    void protectsApiDocumentationWhenEnabled() {
        TestRestTemplate client = new TestRestTemplate();
        String origin = "http://localhost:" + port;
        ResponseEntity<String> docs = client.getForEntity(origin + "/api-docs/openapi-v1.yaml", String.class);
        ResponseEntity<String> swagger = client.getForEntity(origin + "/swagger-ui/index.html", String.class);
        assertThat(docs.getStatusCode().value()).isEqualTo(401);
        assertThat(swagger.getStatusCode().value()).isEqualTo(401);
    }
}
