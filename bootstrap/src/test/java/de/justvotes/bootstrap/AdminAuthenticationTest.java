package de.justvotes.bootstrap;

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

    @Test
    void deniesUnauthenticatedRequestsToAdministrativeEndpointsWithProblemDetails() {
        ResponseEntity<String> response = new TestRestTemplate().getForEntity(
                "http://localhost:" + port + "/api/v1/admin/session", String.class);

        assertThat(response.getStatusCode().value()).isEqualTo(401);
        assertThat(response.getHeaders().getContentType()).hasToString("application/problem+json");
    }

    @Test
    void createsAndInvalidatesAnAdministratorSessionOnlyWithCsrfProtection() {
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
        assertThat(malformedLogin.getStatusCode().value()).isEqualTo(400);
        assertThat(malformedLogin.getHeaders().getContentType()).hasToString("application/problem+json");

        ResponseEntity<String> unsupportedLogin = client.exchange(RequestEntity.post(baseUrl + "/api/v1/admin/login")
                .contentType(MediaType.TEXT_PLAIN)
                .header(HttpHeaders.COOKIE, cookies)
                .header("X-XSRF-TOKEN", csrfToken)
                .body("username=systemadmin"), String.class);
        assertThat(unsupportedLogin.getStatusCode().value()).isEqualTo(415);
        assertThat(unsupportedLogin.getHeaders().getContentType()).hasToString("application/problem+json");

        ResponseEntity<String> csrfRejectedLogin = client.postForEntity(baseUrl + "/api/v1/admin/login",
                "{\"username\":\"systemadmin\",\"password\":\"password\"}", String.class);
        assertThat(csrfRejectedLogin.getStatusCode().value()).isEqualTo(403);
        assertThat(csrfRejectedLogin.getHeaders().getContentType()).hasToString("application/problem+json");

        ResponseEntity<String> rejectedCredentials = client.exchange(RequestEntity.post(baseUrl + "/api/v1/admin/login")
                .contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.COOKIE, cookies)
                .header("X-XSRF-TOKEN", csrfToken)
                .body("{\"username\":\"systemadmin\",\"password\":\"incorrect\"}"), String.class);
        assertThat(rejectedCredentials.getStatusCode().value()).isEqualTo(401);
        assertThat(rejectedCredentials.getHeaders().getContentType()).hasToString("application/problem+json");

        ResponseEntity<String> login = client.exchange(RequestEntity.post(baseUrl + "/api/v1/admin/login")
                .contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.COOKIE, cookies)
                .header("X-XSRF-TOKEN", csrfToken)
                .body("{\"username\":\"systemadmin\",\"password\":\"password\"}"), String.class);
        assertThat(login.getStatusCode().value()).isEqualTo(204);
        cookies = cookies + "; " + cookieHeader(login.getHeaders());

        ResponseEntity<String> session = client.exchange(RequestEntity.get(baseUrl + "/api/v1/admin/session")
                .header(HttpHeaders.COOKIE, cookies).build(), String.class);
        assertThat(session.getStatusCode().value()).isEqualTo(204);

        ResponseEntity<String> csrfRejectedLogout = client.exchange(RequestEntity.post(baseUrl + "/api/v1/admin/logout")
                .header(HttpHeaders.COOKIE, cookies).build(), String.class);
        assertThat(csrfRejectedLogout.getStatusCode().value()).isEqualTo(403);

        ResponseEntity<String> logout = client.exchange(RequestEntity.post(baseUrl + "/api/v1/admin/logout")
                .header(HttpHeaders.COOKIE, cookies)
                .header("X-XSRF-TOKEN", csrfToken)
                .build(), String.class);
        assertThat(logout.getStatusCode().value()).isEqualTo(204);

        ResponseEntity<String> afterLogout = client.exchange(RequestEntity.get(baseUrl + "/api/v1/admin/session")
                .header(HttpHeaders.COOKIE, cookies).build(), String.class);
        assertThat(afterLogout.getStatusCode().value()).isEqualTo(401);
    }
}
