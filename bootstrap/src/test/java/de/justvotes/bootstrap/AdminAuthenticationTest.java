package de.justvotes.bootstrap;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.RequestEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.nio.file.Path;
import java.util.UUID;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AdminAuthenticationTest {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final Path DATABASE_PATH = Path.of("target", "admin-authentication-" + UUID.randomUUID() + ".db");
    private static final Pattern CSRF_TOKEN = Pattern.compile("\\\"token\\\":\\\"([^\\\"]+)\\\"");

    @LocalServerPort
    int port;

    @DynamicPropertySource
    static void applicationProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:sqlite:" + DATABASE_PATH);
        registry.add("ADMIN_USERNAME", () -> "systemadmin");
        registry.add("ADMIN_PASSWORD_HASH", () -> new BCryptPasswordEncoder().encode("password"));
    }

    private static String cookieHeader(HttpHeaders headers) {
        return headers.get(HttpHeaders.SET_COOKIE).stream()
                .map(cookie -> cookie.substring(0, cookie.indexOf(';')))
                .reduce((first, second) -> first + "; " + second)
                .orElseThrow();
    }

    private static void assertProblem(ResponseEntity<String> response, int status, String code) throws Exception {
        assertThat(response.getStatusCode().value()).isEqualTo(status);
        assertThat(response.getHeaders().getCacheControl()).contains("no-store");
        assertThat(response.getHeaders().getContentType()).hasToString("application/problem+json");
        JsonNode body = JSON.readTree(response.getBody());
        assertThat(body.path("type").asText()).isNotBlank();
        assertThat(body.path("title").asText()).isNotBlank();
        assertThat(body.path("status").asInt()).isEqualTo(status);
        assertThat(body.path("code").asText()).isEqualTo(code);
    }

    @Test
    void deniesUnauthenticatedRequestsToAdministrativeEndpointsWithProblemDetails() throws Exception {
        ResponseEntity<String> response = new TestRestTemplate().getForEntity(
                "http://localhost:" + port + "/api/v1/admin/session", String.class);

        assertProblem(response, 401, "authentication-required");
    }

    @Test
    void createsAndInvalidatesAnAdministratorSessionOnlyWithCsrfProtection() throws Exception {
        TestRestTemplate client = new TestRestTemplate();
        String baseUrl = "http://localhost:" + port;
        ResponseEntity<String> csrf = client.getForEntity(baseUrl + "/api/v1/csrf", String.class);
        var csrfTokenMatcher = CSRF_TOKEN.matcher(csrf.getBody());
        assertThat(csrfTokenMatcher.find()).isTrue();
        String csrfToken = csrfTokenMatcher.group(1);
        String cookies = cookieHeader(csrf.getHeaders());

        ResponseEntity<String> malformedLogin = client.exchange(RequestEntity.post(baseUrl + "/api/v1/admin/login")
                .contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.COOKIE, cookies)
                .header("X-XSRF-TOKEN", csrfToken)
                .body("not-json"), String.class);
        assertProblem(malformedLogin, 400, "invalid-request");

        ResponseEntity<String> unsupportedLogin = client.exchange(RequestEntity.post(baseUrl + "/api/v1/admin/login")
                .contentType(MediaType.TEXT_PLAIN)
                .header(HttpHeaders.COOKIE, cookies)
                .header("X-XSRF-TOKEN", csrfToken)
                .body("username=systemadmin"), String.class);
        assertProblem(unsupportedLogin, 415, "unsupported-media-type");

        ResponseEntity<String> csrfRejectedLogin = client.postForEntity(baseUrl + "/api/v1/admin/login",
                "{\"username\":\"systemadmin\",\"password\":\"password\"}", String.class);
        assertProblem(csrfRejectedLogin, 403, "access-denied");

        ResponseEntity<String> rejectedCredentials = client.exchange(RequestEntity.post(baseUrl + "/api/v1/admin/login")
                .contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.COOKIE, cookies)
                .header("X-XSRF-TOKEN", csrfToken)
                .body("{\"username\":\"systemadmin\",\"password\":\"incorrect\"}"), String.class);
        assertProblem(rejectedCredentials, 401, "invalid-credentials");

        ResponseEntity<String> login = client.exchange(RequestEntity.post(baseUrl + "/api/v1/admin/login")
                .contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.COOKIE, cookies)
                .header("X-XSRF-TOKEN", csrfToken)
                .body("{\"username\":\"systemadmin\",\"password\":\"password\"}"), String.class);
        assertThat(login.getStatusCode().value()).isEqualTo(204);
        assertThat(login.getHeaders().getCacheControl()).contains("no-store");
        cookies = cookies + "; " + cookieHeader(login.getHeaders());

        ResponseEntity<String> session = client.exchange(RequestEntity.get(baseUrl + "/api/v1/admin/session")
                .header(HttpHeaders.COOKIE, cookies).build(), String.class);
        assertThat(session.getStatusCode().value()).isEqualTo(204);
        assertThat(session.getHeaders().getCacheControl()).contains("no-store");

        ResponseEntity<String> csrfRejectedLogout = client.exchange(RequestEntity.post(baseUrl + "/api/v1/admin/logout")
                .header(HttpHeaders.COOKIE, cookies).build(), String.class);
        assertProblem(csrfRejectedLogout, 403, "access-denied");

        ResponseEntity<String> logout = client.exchange(RequestEntity.post(baseUrl + "/api/v1/admin/logout")
                .header(HttpHeaders.COOKIE, cookies)
                .header("X-XSRF-TOKEN", csrfToken)
                .build(), String.class);
        assertThat(logout.getStatusCode().value()).isEqualTo(204);
        assertThat(logout.getHeaders().getCacheControl()).contains("no-store");

        ResponseEntity<String> afterLogout = client.exchange(RequestEntity.get(baseUrl + "/api/v1/admin/session")
                .header(HttpHeaders.COOKIE, cookies).build(), String.class);
        assertProblem(afterLogout, 401, "authentication-required");
    }
}
