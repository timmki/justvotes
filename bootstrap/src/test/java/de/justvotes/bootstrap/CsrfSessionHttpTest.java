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
        assertCookie(bootstrap, "XSRF-TOKEN", false, false);
        assertStatus(client.exchange(post(baseUrl + "/admin/login", null, null, credentials()), String.class), 403);
        assertStatus(client.exchange(post(baseUrl + "/admin/login", csrfCookie, "wrong", credentials()), String.class), 403);

        ResponseEntity<String> login = client.exchange(post(baseUrl + "/admin/login", csrfCookie, token, credentials()), String.class);
        assertStatus(login, 204);
        assertCookie(login, "JSESSIONID", true, false);
        String authenticatedCookies = csrfCookie + "; " + cookies(login);

        assertStatus(client.exchange(post(baseUrl + "/identity", authenticatedCookies, null, "{\"userID\":\"alice\"}"), String.class), 403);
        assertStatus(client.exchange(post(baseUrl + "/identity", authenticatedCookies, "wrong", "{\"userID\":\"alice\"}"), String.class), 403);
        ResponseEntity<String> identity = client.exchange(post(baseUrl + "/identity", authenticatedCookies, token, "{\"userID\":\"alice\"}"), String.class);
        assertStatus(identity, 204);
        assertCookie(identity, "userID", true, false);

        assertStatus(client.exchange(post(baseUrl + "/admin/template-catalog/templates", authenticatedCookies, null, "{\"name\":\"CSRF\"}"), String.class), 403);
        assertStatus(client.exchange(post(baseUrl + "/admin/template-catalog/templates", authenticatedCookies, "wrong", "{\"name\":\"CSRF\"}"), String.class), 403);
        assertStatus(client.exchange(post(baseUrl + "/admin/template-catalog/templates", authenticatedCookies, token, "{\"name\":\"CSRF\"}"), String.class), 201);

        assertStatus(client.exchange(post(baseUrl + "/admin/logout", authenticatedCookies, null, null), String.class), 403);
        assertStatus(client.exchange(post(baseUrl + "/admin/logout", authenticatedCookies, "wrong", null), String.class), 403);
        assertStatus(client.exchange(post(baseUrl + "/admin/logout", authenticatedCookies, token, null), String.class), 204);
        assertStatus(client.exchange(RequestEntity.get(baseUrl + "/admin/session").header(HttpHeaders.COOKIE, authenticatedCookies).build(), String.class), 401);
    }

    @Test
    void marksAllCookiesSecureWhenForwardedExternalProtocolIsHttps() {
        TestRestTemplate client = new TestRestTemplate();
        String baseUrl = "http://localhost:" + port + "/api/v1";
        RequestEntity<Void> forwardedGet = RequestEntity.get(baseUrl + "/csrf")
                .header("X-Forwarded-Proto", "https").build();
        ResponseEntity<String> bootstrap = client.exchange(forwardedGet, String.class);
        String token = token(bootstrap);
        String csrfCookie = cookies(bootstrap);
        assertCookie(bootstrap, "XSRF-TOKEN", false, true);

        RequestEntity<String> loginRequest = RequestEntity.post(baseUrl + "/admin/login")
                .header("X-Forwarded-Proto", "https")
                .header(HttpHeaders.COOKIE, csrfCookie)
                .header("X-XSRF-TOKEN", token)
                .contentType(MediaType.APPLICATION_JSON).body(credentials());
        ResponseEntity<String> login = client.exchange(loginRequest, String.class);
        assertStatus(login, 204);
        assertCookie(login, "JSESSIONID", true, true);

        RequestEntity<String> identityRequest = RequestEntity.post(baseUrl + "/identity")
                .header("X-Forwarded-Proto", "https")
                .header(HttpHeaders.COOKIE, csrfCookie + "; " + cookies(login))
                .header("X-XSRF-TOKEN", token)
                .contentType(MediaType.APPLICATION_JSON).body("{\"userID\":\"Alice\"}");
        ResponseEntity<String> identity = client.exchange(identityRequest, String.class);
        assertStatus(identity, 204);
        assertCookie(identity, "userID", true, true);
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
    private static void assertCookie(ResponseEntity<String> response, String name, boolean httpOnly, boolean secure) {
        String cookie = response.getHeaders().get(HttpHeaders.SET_COOKIE).stream()
                .filter(value -> value.startsWith(name + "=")).findFirst().orElseThrow();
        assertThat(cookie).contains("Path=/", "SameSite=Lax");
        if (httpOnly) assertThat(cookie).contains("HttpOnly"); else assertThat(cookie).doesNotContain("HttpOnly");
        if (secure) assertThat(cookie).contains("Secure"); else assertThat(cookie).doesNotContain("Secure");
        if (name.equals("userID")) assertThat(cookie).contains("Max-Age=315360000");
    }
    private static void assertStatus(ResponseEntity<String> response, int expected) { assertThat(response.getStatusCode().value()).isEqualTo(expected); if (expected >= 400) assertThat(response.getHeaders().getContentType()).hasToString("application/problem+json"); }
}
