package de.justvotes.bootstrap;

import de.justvotes.bootstrap.support.AccountFixtures;
import de.justvotes.bootstrap.support.AccountHttpTestBase;
import de.justvotes.bootstrap.support.TestSession;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.nio.file.Path;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
class PasswordChangeHttpTest extends AccountHttpTestBase {
    private static final Path DATABASE_PATH = Path.of("target", "password-change-" + UUID.randomUUID() + ".db");

    @DynamicPropertySource
    static void applicationProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:sqlite:" + DATABASE_PATH);
        registry.add("ADMIN_EMAIL", () -> "systemadmin@example.test");
        registry.add("ADMIN_PASSWORD_HASH", () -> new BCryptPasswordEncoder().encode("password"));
    }

    private static String change(String current, String next) {
        return "{\"currentPassword\":\"" + current + "\",\"newPassword\":\"" + next + "\"}";
    }

    @Test
    void changesThePasswordKeepsTheCurrentSessionAndEndsOtherSessions() {
        String name = AccountFixtures.email("Changer");
        TestSession first = fixtures().loginAsUser("Changer");
        TestSession second = fixtures().login(name, AccountFixtures.USER_PASSWORD);

        ResponseEntity<String> changed = first.put(url("/session/password"), change(AccountFixtures.USER_PASSWORD, "a-brand-new-password"));
        assertThat(changed.getStatusCode().value()).as(changed.getBody()).isEqualTo(204);
        assertThat(changed.getHeaders().getCacheControl()).contains("no-store");

        assertThat(first.get(url("/polls")).getStatusCode().value()).isEqualTo(200);
        assertProblem(second.get(url("/polls")), 401, "authentication-required");
        assertProblem(fixtures().attemptLogin(fixtures().anonymous(), name, AccountFixtures.USER_PASSWORD), 401, "invalid-credentials");
        assertThat(fixtures().attemptLogin(fixtures().anonymous(), name, "a-brand-new-password").getStatusCode().value()).isEqualTo(200);
    }

    @Test
    void rejectsWrongCurrentPasswordsAndWeakNewPasswords() {
        TestSession user = fixtures().loginAsUser("Careful");
        assertProblem(user.put(url("/session/password"), change("wrong-current", "a-brand-new-password")), 422, "current-password-invalid");
        assertProblem(user.put(url("/session/password"), change(AccountFixtures.USER_PASSWORD, "too-short")), 422, "password-policy-violation");
        assertProblem(user.put(url("/session/password"), change(AccountFixtures.USER_PASSWORD, AccountFixtures.USER_PASSWORD)), 422, "password-policy-violation");
        assertThat(user.get(url("/session")).getStatusCode().value()).isEqualTo(200);
    }

    @Test
    void theAdministratorCanChangeItsOwnPasswordToo() {
        TestSession admin = fixtures().loginAsAdmin();
        assertThat(admin.put(url("/session/password"), change("password", "admin-password-2026")).getStatusCode().value()).isEqualTo(204);
        assertThat(fixtures().login("systemadmin@example.test", "admin-password-2026").get(url("/session")).getStatusCode().value()).isEqualTo(200);
    }
}
