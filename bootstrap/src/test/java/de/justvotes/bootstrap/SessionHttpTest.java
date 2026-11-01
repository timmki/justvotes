package de.justvotes.bootstrap;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import de.justvotes.accountmanagement.core.ports.out.AccountRepository;
import de.justvotes.accountmanagement.core.ports.out.PasswordHasher;
import de.justvotes.bootstrap.support.AccountFixtures;
import de.justvotes.bootstrap.support.TestSession;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.RequestEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;

import java.nio.file.Path;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
class SessionHttpTest {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final Path DATABASE_PATH = Path.of("target", "session-" + UUID.randomUUID() + ".db");

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
        registry.add("ADMIN_EMAIL", () -> AccountFixtures.ADMIN_EMAIL);
        registry.add("ADMIN_PASSWORD_HASH", () -> new BCryptPasswordEncoder().encode(AccountFixtures.ADMIN_PASSWORD));
    }

    static void assertProblem(ResponseEntity<String> response, int status, String code) throws Exception {
        assertThat(response.getStatusCode().value()).isEqualTo(status);
        assertThat(response.getHeaders().getCacheControl()).contains("no-store");
        assertThat(response.getHeaders().getContentType()).hasToString("application/problem+json");
        JsonNode body = JSON.readTree(response.getBody());
        assertThat(body.path("type").asText()).isNotBlank();
        assertThat(body.path("title").asText()).isNotBlank();
        assertThat(body.path("status").asInt()).isEqualTo(status);
        assertThat(body.path("code").asText()).isEqualTo(code);
    }

    private AccountFixtures fixtures() {
        return new AccountFixtures(accounts, hasher, transactionManager, port);
    }

    private String url(String path) {
        return "http://localhost:" + port + "/api/v1" + path;
    }

    @Test
    void rejectsMalformedUnsupportedAndCsrfLessLogins() throws Exception {
        TestSession anonymous = fixtures().anonymous();
        ResponseEntity<String> malformed = anonymous.client().exchange(RequestEntity.post(url("/session/login"))
                .contentType(MediaType.APPLICATION_JSON).header(HttpHeaders.COOKIE, anonymous.cookies())
                .header("X-XSRF-TOKEN", anonymous.csrfToken()).body("not-json"), String.class);
        assertProblem(malformed, 400, "invalid-request");

        ResponseEntity<String> unsupported = anonymous.client().exchange(RequestEntity.post(url("/session/login"))
                .contentType(MediaType.TEXT_PLAIN).header(HttpHeaders.COOKIE, anonymous.cookies())
                .header("X-XSRF-TOKEN", anonymous.csrfToken()).body("email=systemadmin@example.test"), String.class);
        assertProblem(unsupported, 415, "unsupported-media-type");

        ResponseEntity<String> withoutCsrf = anonymous.postWithoutCsrf(url("/session/login"),
                "{\"email\":\"systemadmin@example.test\",\"password\":\"password\"}");
        assertProblem(withoutCsrf, 403, "access-denied");
    }

    @Test
    void wrongPasswordsAndUnknownNamesAreRejectedIdentically() throws Exception {
        fixtures().userWithIdentity("Identical");
        TestSession anonymous = fixtures().anonymous();
        ResponseEntity<String> wrongPassword = fixtures().attemptLogin(anonymous,
                AccountFixtures.email("Identical"), "not-the-password");
        ResponseEntity<String> unknownName = fixtures().attemptLogin(anonymous, "nobody-here", "not-the-password");

        assertProblem(wrongPassword, 401, "invalid-credentials");
        assertProblem(unknownName, 401, "invalid-credentials");
        assertThat(JSON.readTree(wrongPassword.getBody()).path("detail").asText())
                .isEqualTo(JSON.readTree(unknownName.getBody()).path("detail").asText());
    }

    @Test
    void userLoginReturnsTheSessionAndRotatesTheSessionCookie() throws Exception {
        fixtures().userWithIdentity("Session User");
        TestSession anonymous = fixtures().anonymous();
        ResponseEntity<String> first = fixtures().attemptLogin(anonymous, AccountFixtures.email("Session User"),
                AccountFixtures.USER_PASSWORD);
        assertThat(first.getStatusCode().value()).isEqualTo(200);
        assertThat(first.getHeaders().getCacheControl()).contains("no-store");
        JsonNode body = JSON.readTree(first.getBody());
        assertThat(body.path("email").asText()).isEqualTo(AccountFixtures.email("Session User"));
        assertThat(body.path("role").asText()).isEqualTo("user");
        assertThat(body.path("identity").asText()).isEqualTo("Session User");
        assertThat(body.path("passwordChangeRequired").asBoolean()).isFalse();
        List<String> setCookies = first.getHeaders().get(HttpHeaders.SET_COOKIE);
        assertThat(setCookies).anyMatch(cookie -> cookie.startsWith("JSESSIONID=") && cookie.contains("HttpOnly"));
        assertThat(setCookies).anyMatch(cookie -> cookie.startsWith("userID=;") && cookie.contains("Max-Age=0"));

        String firstSession = AccountFixtures.cookieHeader(first.getHeaders());
        TestSession signedIn = new TestSession(anonymous.client(), anonymous.cookies() + "; " + firstSession,
                anonymous.csrfToken());
        ResponseEntity<String> second = fixtures().attemptLogin(signedIn, AccountFixtures.email("Session User"),
                AccountFixtures.USER_PASSWORD);
        assertThat(AccountFixtures.cookieHeader(second.getHeaders())).isNotEqualTo(firstSession);
        assertProblem(signedIn.get(url("/session")), 401, "authentication-required");
    }

    @Test
    void administratorSignsInThroughTheSameEndpointWithoutIdentity() throws Exception {
        TestSession admin = fixtures().loginAsAdmin();
        ResponseEntity<String> session = admin.get(url("/session"));
        assertThat(session.getStatusCode().value()).isEqualTo(200);
        assertThat(session.getHeaders().getCacheControl()).contains("no-store");
        JsonNode body = JSON.readTree(session.getBody());
        assertThat(body.path("role").asText()).isEqualTo("admin");
        assertThat(body.path("identity").isNull()).isTrue();
    }

    @Test
    void logoutRequiresCsrfAndEndsTheSession() throws Exception {
        TestSession user = fixtures().loginAsUser("Logout User");
        assertThat(user.get(url("/session")).getStatusCode().value()).isEqualTo(200);

        ResponseEntity<String> withoutCsrf = user.client().exchange(RequestEntity.post(url("/session/logout"))
                .header(HttpHeaders.COOKIE, user.cookies()).build(), String.class);
        assertProblem(withoutCsrf, 403, "access-denied");

        ResponseEntity<String> logout = user.post(url("/session/logout"));
        assertThat(logout.getStatusCode().value()).isEqualTo(204);
        assertThat(logout.getHeaders().getCacheControl()).contains("no-store");
        assertProblem(user.get(url("/session")), 401, "authentication-required");
        assertProblem(user.get(url("/polls")), 401, "authentication-required");
    }

    @Test
    void currentSessionRequiresAuthentication() throws Exception {
        assertProblem(fixtures().anonymous().get(url("/session")), 401, "authentication-required");
    }
}
