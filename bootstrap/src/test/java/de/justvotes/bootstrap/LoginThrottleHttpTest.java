package de.justvotes.bootstrap;

import de.justvotes.bootstrap.support.AccountFixtures;
import de.justvotes.bootstrap.support.AccountHttpTestBase;
import de.justvotes.bootstrap.support.TestSession;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.nio.file.Path;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
class LoginThrottleHttpTest extends AccountHttpTestBase {
    private static final Path DATABASE_PATH = Path.of("target", "login-throttle-" + UUID.randomUUID() + ".db");

    @DynamicPropertySource
    static void applicationProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:sqlite:" + DATABASE_PATH);
        registry.add("ADMIN_USERNAME", () -> "systemadmin");
        registry.add("ADMIN_PASSWORD_HASH", () -> new BCryptPasswordEncoder().encode("password"));
    }

    @Test
    void throttlesTheSixthConsecutiveFailureForExistingAccounts() {
        String name = AccountFixtures.accountName("Throttled");
        fixtures().userWithIdentity("Throttled");
        TestSession anonymous = fixtures().anonymous();
        for (int attempt = 0; attempt < 5; attempt++) {
            assertProblem(fixtures().attemptLogin(anonymous, name, "wrong-password"), 401, "invalid-credentials");
        }
        ResponseEntity<String> throttled = fixtures().attemptLogin(anonymous, name, AccountFixtures.USER_PASSWORD);
        assertProblem(throttled, 429, "login-throttled");
        int retryAfter = Integer.parseInt(throttled.getHeaders().getFirst(HttpHeaders.RETRY_AFTER));
        assertThat(retryAfter).isBetween(1, 30);
    }

    @Test
    void throttlesUnknownNamesTheSameWay() {
        TestSession anonymous = fixtures().anonymous();
        for (int attempt = 0; attempt < 5; attempt++) {
            assertProblem(fixtures().attemptLogin(anonymous, "Nobody.Known", "wrong-password"), 401, "invalid-credentials");
        }
        assertProblem(fixtures().attemptLogin(anonymous, "nobody.known", "wrong-password"), 429, "login-throttled");
    }

    @Test
    void successfulLoginResetsTheCounter() {
        String name = AccountFixtures.accountName("Recovering");
        fixtures().userWithIdentity("Recovering");
        TestSession anonymous = fixtures().anonymous();
        for (int attempt = 0; attempt < 4; attempt++) {
            fixtures().attemptLogin(anonymous, name, "wrong-password");
        }
        assertThat(fixtures().attemptLogin(anonymous, name, AccountFixtures.USER_PASSWORD).getStatusCode().value()).isEqualTo(200);
        for (int attempt = 0; attempt < 4; attempt++) {
            assertProblem(fixtures().attemptLogin(fixtures().anonymous(), name, "wrong-password"), 401, "invalid-credentials");
        }
    }
}
