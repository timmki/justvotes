package de.justvotes.bootstrap;

import de.justvotes.accountmanagement.core.ports.out.AccountRepository;
import de.justvotes.accountmanagement.core.ports.out.PasswordHasher;
import de.justvotes.bootstrap.support.AccountFixtures;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.RequestEntity.BodyBuilder;
import org.springframework.http.RequestEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;

import java.nio.file.Path;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
class CsrfSessionHttpTest {
    private static final Path DATABASE_PATH = Path.of("target", "csrf-session-" + UUID.randomUUID() + ".db");
    private static final Pattern TOKEN = Pattern.compile("\\\"token\\\":\\\"([^\\\"]+)\\\"");

    @LocalServerPort
    int port;
    @Autowired
    AccountRepository accounts;
    @Autowired
    PasswordHasher hasher;
    @Autowired
    PlatformTransactionManager transactionManager;

    @DynamicPropertySource
    static void applicationProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:sqlite:" + DATABASE_PATH);
        registry.add("ADMIN_EMAIL", () -> "systemadmin@example.test");
        registry.add("ADMIN_PASSWORD_HASH", () -> new BCryptPasswordEncoder().encode("password"));
    }

    private static RequestEntity<String> post(String url, String cookies, String csrfToken, String body) {
        BodyBuilder request = RequestEntity.post(url);
        if (cookies != null) request.header(HttpHeaders.COOKIE, cookies);
        if (csrfToken != null) request.header("X-XSRF-TOKEN", csrfToken);
        if (body != null) request.contentType(MediaType.APPLICATION_JSON);
        return request.body(body);
    }

    private static String credentials(String name, String password) {
        return "{\"email\":\"" + name + "\",\"password\":\"" + password + "\"}";
    }

    private static String token(ResponseEntity<String> response) {
        Matcher matcher = TOKEN.matcher(response.getBody());
        assertThat(matcher.find()).isTrue();
        return matcher.group(1);
    }

    private static String cookies(ResponseEntity<String> response) {
        return AccountFixtures.cookieHeader(response.getHeaders());
    }

    private static void assertCookie(ResponseEntity<String> response, String name, boolean httpOnly, boolean secure) {
        String cookie = response.getHeaders().get(HttpHeaders.SET_COOKIE).stream()
                .filter(value -> value.startsWith(name + "=")).findFirst().orElseThrow();
        assertThat(cookie).contains("Path=/", "SameSite=Lax");
        if (httpOnly) assertThat(cookie).contains("HttpOnly");
        else assertThat(cookie).doesNotContain("HttpOnly");
        if (secure) assertThat(cookie).contains("Secure");
        else assertThat(cookie).doesNotContain("Secure");
    }

    private static void assertStatus(ResponseEntity<String> response, int expected) {
        assertThat(response.getStatusCode().value()).isEqualTo(expected);
        if (expected >= 400) assertThat(response.getHeaders().getContentType()).hasToString("application/problem+json");
    }

    private AccountFixtures fixtures() {
        return new AccountFixtures(accounts, hasher, transactionManager, port);
    }

    @Test
    void enforcesTheDocumentedCsrfAndServerSideSessionFlow() {
        TestRestTemplate client = new TestRestTemplate();
        String baseUrl = "http://localhost:" + port + "/api/v1";
        ResponseEntity<String> bootstrap = client.getForEntity(baseUrl + "/csrf", String.class);
        String token = token(bootstrap);
        String csrfCookie = cookies(bootstrap);
        String admin = credentials("systemadmin@example.test", "password");

        assertThat(bootstrap.getStatusCode().value()).isEqualTo(200);
        assertThat(bootstrap.getBody()).contains("\"headerName\":\"X-XSRF-TOKEN\"");
        assertCookie(bootstrap, "XSRF-TOKEN", false, false);
        assertStatus(client.exchange(post(baseUrl + "/session/login", null, null, admin), String.class), 403);
        assertStatus(client.exchange(post(baseUrl + "/session/login", csrfCookie, "wrong", admin), String.class), 403);

        ResponseEntity<String> login = client.exchange(post(baseUrl + "/session/login", csrfCookie, token, admin), String.class);
        assertStatus(login, 200);
        assertCookie(login, "JSESSIONID", true, false);
        String authenticatedCookies = csrfCookie + "; " + cookies(login);

        assertStatus(client.exchange(post(baseUrl + "/admin/template-catalog/templates", authenticatedCookies, null, "{\"name\":\"CSRF\"}"), String.class), 403);
        assertStatus(client.exchange(post(baseUrl + "/admin/template-catalog/templates", authenticatedCookies, "wrong", "{\"name\":\"CSRF\"}"), String.class), 403);
        assertStatus(client.exchange(post(baseUrl + "/admin/template-catalog/templates", authenticatedCookies, token, "{\"name\":\"CSRF\"}"), String.class), 201);

        assertStatus(client.exchange(post(baseUrl + "/session/logout", authenticatedCookies, null, null), String.class), 403);
        assertStatus(client.exchange(post(baseUrl + "/session/logout", authenticatedCookies, "wrong", null), String.class), 403);
        assertStatus(client.exchange(post(baseUrl + "/session/logout", authenticatedCookies, token, null), String.class), 204);
        assertStatus(client.exchange(RequestEntity.get(baseUrl + "/session").header(HttpHeaders.COOKIE, authenticatedCookies).build(), String.class), 401);
    }

    @Test
    void marksAllCookiesSecureWhenForwardedExternalProtocolIsHttps() {
        fixtures().userWithIdentity("Älice #42");
        TestRestTemplate client = new TestRestTemplate();
        String baseUrl = "http://localhost:" + port + "/api/v1";
        RequestEntity<Void> forwardedGet = RequestEntity.get(baseUrl + "/csrf")
                .header("X-Forwarded-Proto", "https").build();
        ResponseEntity<String> bootstrap = client.exchange(forwardedGet, String.class);
        String token = token(bootstrap);
        String csrfCookie = cookies(bootstrap);
        assertCookie(bootstrap, "XSRF-TOKEN", false, true);

        RequestEntity<String> loginRequest = RequestEntity.post(baseUrl + "/session/login")
                .header("X-Forwarded-Proto", "https")
                .header(HttpHeaders.COOKIE, csrfCookie)
                .header("X-XSRF-TOKEN", token)
                .contentType(MediaType.APPLICATION_JSON)
                .body(credentials(AccountFixtures.email("Älice #42"), AccountFixtures.USER_PASSWORD));
        ResponseEntity<String> login = client.exchange(loginRequest, String.class);
        assertStatus(login, 200);
        assertCookie(login, "JSESSIONID", true, true);
        assertCookie(login, "userID", true, true);
        assertThat(login.getBody()).contains("\"identity\":\"Älice #42\"");
    }

    @Test
    void ignoresLegacyIdentityCookiesWithoutASession() {
        TestRestTemplate client = new TestRestTemplate();
        String baseUrl = "http://localhost:" + port + "/api/v1";
        for (String path : new String[]{"/identity/votes", "/polls", "/session"}) {
            ResponseEntity<String> response = client.exchange(RequestEntity.get(baseUrl + path)
                    .header(HttpHeaders.COOKIE, "userID=Alice_1").build(), String.class);
            assertStatus(response, 401);
            assertThat(response.getBody()).doesNotContain("Alice_1");
        }
    }
}
