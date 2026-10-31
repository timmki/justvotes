package de.justvotes.bootstrap;

import de.justvotes.bootstrap.support.AccountHttpTestBase;
import de.justvotes.bootstrap.support.TestSession;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.RequestEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.yaml.snakeyaml.Yaml;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
class RoleAuthorizationHttpTest extends AccountHttpTestBase {
    private static final Path DATABASE_PATH = Path.of("target", "roles-" + UUID.randomUUID() + ".db");

    @DynamicPropertySource
    static void applicationProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:sqlite:" + DATABASE_PATH);
        registry.add("ADMIN_USERNAME", () -> "systemadmin");
        registry.add("ADMIN_PASSWORD_HASH", () -> new BCryptPasswordEncoder().encode("password"));
        registry.add("justvotes.api-docs.enabled", () -> "true");
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> map(Object value) {
        return (Map<String, Object>) value;
    }

    private static String concrete(String path) {
        return path.replace("{pollId}", "p_v1_missing").replace("{groupId}", "g_v1_missing")
                .replace("{templateId}", "t_v1_missing").replace("{voteId}", "v_v1_missing")
                .replace("{invitationId}", "i_v1_missing").replace("{accountId}", "a_v1_missing");
    }

    private static int status(TestSession session, String method, String url) {
        return switch (method) {
            case "get" -> session.get(url).getStatusCode().value();
            case "post" -> session.post(url, "{}").getStatusCode().value();
            case "put" -> session.put(url, "{}").getStatusCode().value();
            case "patch" -> session.patch(url, "{}").getStatusCode().value();
            default -> session.delete(url, "{}").getStatusCode().value();
        };
    }

    @Test
    void separatesUserAndAdministratorOperationsForEveryContractOperation() {
        TestSession user = fixtures().loginAsUser("Role User");
        TestSession admin = fixtures().loginAsAdmin();
        Map<String, Object> paths = map(map(new Yaml().load(getClass().getClassLoader()
                .getResourceAsStream("docs/justvotes-v1.yaml"))).get("paths"));

        paths.forEach((path, item) -> map(item).forEach((method, value) -> {
            if (!(value instanceof Map)) return;
            String url = url(concrete(path));
            if (path.startsWith("/admin/")) {
                assertThat(status(user, method, url)).as("user " + method + " " + path).isEqualTo(403);
                assertThat(status(admin, method, url)).as("admin " + method + " " + path).isNotIn(401, 403);
            }
            if (path.startsWith("/polls") || path.startsWith("/identity/")) {
                assertThat(status(admin, method, url)).as("admin " + method + " " + path).isEqualTo(403);
                assertThat(status(user, method, url)).as("user " + method + " " + path).isNotIn(401, 403);
            }
        }));
    }

    @Test
    void bothRolesUseTheirOwnSession() {
        assertThat(json(fixtures().loginAsUser("Role User 2").get(url("/session"))).path("role").asText()).isEqualTo("user");
        assertThat(json(fixtures().loginAsAdmin().get(url("/session"))).path("role").asText()).isEqualTo("admin");
    }

    @Test
    void apiDocumentationIsOnlyForTheAdministrator() {
        TestRestTemplate client = new TestRestTemplate();
        for (TestSession session : List.of(fixtures().loginAsUser("Docs User"), fixtures().loginAsAdmin())) {
            String role = json(session.get(url("/session"))).path("role").asText();
            for (String path : List.of("/swagger-ui/index.html", "/swagger-ui/swagger-ui-bundle.js", "/api-docs/openapi-v1.yaml")) {
                int status = client.exchange(RequestEntity.get("http://localhost:" + port + path)
                        .header(HttpHeaders.COOKIE, session.cookies()).build(), String.class).getStatusCode().value();
                assertThat(status).as(role + " " + path).isEqualTo(role.equals("admin") ? 200 : 403);
            }
        }
    }
}
