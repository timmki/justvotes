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
class CsrfSessionHttpTest {
    private static final Path DATABASE_PATH = Path.of("target", "csrf-session-" + UUID.randomUUID() + ".db");
    private static final Pattern TOKEN = Pattern.compile("\\\"token\\\":\\\"([^\\\"]+)\\\"");

    @LocalServerPort
    int port;

    @DynamicPropertySource
    static void applicationProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:sqlite:" + DATABASE_PATH);
        registry.add("ADMIN_USERNAME", () -> "systemadmin");
        registry.add("ADMIN_PASSWORD_HASH", () -> new BCryptPasswordEncoder().encode("password"));
    }

    @Test
    void enforcesTheDocumentedCsrfAndServerSideSessionFlow() {
        TestRestTemplate client = new TestRestTemplate();
        String baseUrl = "http://localhost:" + port + "/api/v1";
        ResponseEntity<String> bootstrap = client.getForEntity(baseUrl + "/csrf", String.class);
        String token = token(bootstrap);
        String csrfCookie = cookies(bootstrap);

        assertThat(bootstrap.getStatusCode().value()).isEqualTo(200);
        assertThat(bootstrap.getBody()).contains("\"headerName\":\"X-XSRF-TOKEN\"");
        assertThat(bootstrap.getHeaders().get(HttpHeaders.SET_COOKIE)).anyMatch(cookie -> cookie.startsWith("XSRF-TOKEN="));
        assertStatus(client.exchange(post(baseUrl + "/admin/login", null, null, credentials()), String.class), 403);
        assertStatus(client.exchange(post(baseUrl + "/admin/login", csrfCookie, "wrong", credentials()), String.class), 403);

        ResponseEntity<String> login = client.exchange(post(baseUrl + "/admin/login", csrfCookie, token, credentials()), String.class);
        assertStatus(login, 204);
        assertThat(login.getHeaders().get(HttpHeaders.SET_COOKIE)).anyMatch(cookie -> cookie.startsWith("JSESSIONID="));
        String authenticatedCookies = csrfCookie + "; " + cookies(login);

        assertStatus(client.exchange(post(baseUrl + "/identity", authenticatedCookies, null, "{\"userID\":\"alice\"}"), String.class), 403);
        assertStatus(client.exchange(post(baseUrl + "/identity", authenticatedCookies, "wrong", "{\"userID\":\"alice\"}"), String.class), 403);
        ResponseEntity<String> identity = client.exchange(post(baseUrl + "/identity", authenticatedCookies, token, "{\"userID\":\"alice\"}"), String.class);
        assertStatus(identity, 204);
        assertThat(identity.getHeaders().get(HttpHeaders.SET_COOKIE)).anyMatch(cookie -> cookie.startsWith("userID=alice;"));

        assertStatus(client.exchange(post(baseUrl + "/admin/template-catalog/templates", authenticatedCookies, null, "{\"name\":\"CSRF\"}"), String.class), 403);
        assertStatus(client.exchange(post(baseUrl + "/admin/template-catalog/templates", authenticatedCookies, "wrong", "{\"name\":\"CSRF\"}"), String.class), 403);
        assertStatus(client.exchange(post(baseUrl + "/admin/template-catalog/templates", authenticatedCookies, token, "{\"name\":\"CSRF\"}"), String.class), 201);

        assertStatus(client.exchange(post(baseUrl + "/admin/logout", authenticatedCookies, null, null), String.class), 403);
        assertStatus(client.exchange(post(baseUrl + "/admin/logout", authenticatedCookies, "wrong", null), String.class), 403);
        assertStatus(client.exchange(post(baseUrl + "/admin/logout", authenticatedCookies, token, null), String.class), 204);
        assertStatus(client.exchange(RequestEntity.get(baseUrl + "/admin/session").header(HttpHeaders.COOKIE, authenticatedCookies).build(), String.class), 401);
    }

    private static RequestEntity<String> post(String url, String cookies, String csrfToken, String body) {
        RequestEntity.BodyBuilder request = RequestEntity.post(url);
        if (cookies != null) request.header(HttpHeaders.COOKIE, cookies);
        if (csrfToken != null) request.header("X-XSRF-TOKEN", csrfToken);
        if (body != null) request.contentType(MediaType.APPLICATION_JSON);
        return request.body(body);
    }

    private static String credentials() { return "{\"username\":\"systemadmin\",\"password\":\"password\"}"; }
    private static String token(ResponseEntity<String> response) { var matcher = TOKEN.matcher(response.getBody()); assertThat(matcher.find()).isTrue(); return matcher.group(1); }
    private static String cookies(ResponseEntity<String> response) { return response.getHeaders().get(HttpHeaders.SET_COOKIE).stream().map(value -> value.substring(0, value.indexOf(';'))).reduce((left, right) -> left + "; " + right).orElseThrow(); }
    private static void assertStatus(ResponseEntity<String> response, int expected) { assertThat(response.getStatusCode().value()).isEqualTo(expected); if (expected >= 400) assertThat(response.getHeaders().getContentType()).hasToString("application/problem+json"); }
}
