package de.justvotes.bootstrap;

import com.fasterxml.jackson.databind.JsonNode;
import de.justvotes.adapters.shared.infra.in.http.OpaqueIdCodec;
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
class AccountAdministrationHttpTest extends AccountHttpTestBase {
    private static final Path DATABASE_PATH = Path.of("target", "account-administration-" + UUID.randomUUID() + ".db");

    @DynamicPropertySource
    static void applicationProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:sqlite:" + DATABASE_PATH);
        registry.add("ADMIN_EMAIL", () -> "systemadmin@example.test");
        registry.add("ADMIN_PASSWORD_HASH", () -> new BCryptPasswordEncoder().encode("password"));
    }

    private static String accountId(TestSession admin, String path, String email) {
        for (JsonNode account : json(admin.get(path))) {
            if (account.path("email").asText().equals(email)) {
                return account.path("accountId").asText();
            }
        }
        throw new AssertionError("No account " + email);
    }

    @Test
    void listsAccountsWithAdministratorFirst() {
        fixtures().userWithIdentity("Listed");
        TestSession admin = fixtures().loginAsAdmin();
        ResponseEntity<String> listed = admin.get(url("/admin/accounts"));
        assertThat(listed.getStatusCode().value()).isEqualTo(200);
        JsonNode accountsJson = json(listed);
        assertThat(accountsJson.get(0).path("role").asText()).isEqualTo("admin");
        assertThat(accountsJson.get(0).path("identity").isNull()).isTrue();
        JsonNode listedUser = null;
        for (JsonNode account : accountsJson) {
            if (account.path("identity").asText().equals("Listed")) {
                listedUser = account;
            }
        }
        assertThat(listedUser).isNotNull();
        assertThat(listedUser.path("accountId").asText()).startsWith("a_v1_");
        assertThat(listedUser.path("status").asText()).isEqualTo("active");
        assertThat(listedUser.has("passwordHash")).isFalse();
        assertThat(listedUser.toString()).doesNotContain("pbkdf2", "bcrypt");
    }

    @Test
    void lockingEndsSessionsAndBlocksLoginUntilUnlocked() {
        String name = AccountFixtures.email("Lockable");
        TestSession user = fixtures().loginAsUser("Lockable");
        TestSession admin = fixtures().loginAsAdmin();
        String id = accountId(admin, url("/admin/accounts"), name);

        ResponseEntity<String> locked = admin.post(url("/admin/accounts/" + id + "/lock"));
        assertThat(locked.getStatusCode().value()).isEqualTo(200);
        assertThat(json(locked).path("status").asText()).isEqualTo("locked");
        assertProblem(user.get(url("/polls")), 401, "authentication-required");
        assertProblem(fixtures().attemptLogin(fixtures().anonymous(), name, AccountFixtures.USER_PASSWORD), 401, "invalid-credentials");

        assertThat(json(admin.post(url("/admin/accounts/" + id + "/unlock"))).path("status").asText()).isEqualTo("active");
        assertThat(fixtures().attemptLogin(fixtures().anonymous(), name, AccountFixtures.USER_PASSWORD).getStatusCode().value()).isEqualTo(200);
    }

    @Test
    void oneTimePasswordForcesAPasswordChangeBeforeAnythingElse() {
        String name = AccountFixtures.email("Forgetful");
        TestSession user = fixtures().loginAsUser("Forgetful");
        TestSession admin = fixtures().loginAsAdmin();
        String id = accountId(admin, url("/admin/accounts"), name);

        ResponseEntity<String> issued = admin.post(url("/admin/accounts/" + id + "/one-time-password"));
        assertThat(issued.getStatusCode().value()).isEqualTo(200);
        assertThat(issued.getHeaders().getCacheControl()).contains("no-store");
        String oneTimePassword = json(issued).path("password").asText();
        assertThat(oneTimePassword).hasSize(16);
        assertProblem(user.get(url("/polls")), 401, "authentication-required");

        TestSession temporary = fixtures().login(name, oneTimePassword);
        assertThat(json(temporary.get(url("/session"))).path("passwordChangeRequired").asBoolean()).isTrue();
        assertProblem(temporary.get(url("/polls")), 403, "password-change-required");
        assertProblem(temporary.get(url("/identity/votes")), 403, "password-change-required");

        String change = "{\"currentPassword\":\"" + oneTimePassword + "\",\"newPassword\":\"my-own-new-password\"}";
        assertThat(temporary.put(url("/session/password"), change).getStatusCode().value()).isEqualTo(204);
        assertThat(temporary.get(url("/polls")).getStatusCode().value()).isEqualTo(200);
        assertThat(json(temporary.get(url("/session"))).path("passwordChangeRequired").asBoolean()).isFalse();
    }

    @Test
    void theAdministratorAccountCannotBeLockedOrReset() {
        TestSession admin = fixtures().loginAsAdmin();
        String id = accountId(admin, url("/admin/accounts"), "systemadmin@example.test");
        assertProblem(admin.post(url("/admin/accounts/" + id + "/lock")), 409, "account-not-manageable");
        assertProblem(admin.post(url("/admin/accounts/" + id + "/one-time-password")), 409, "account-not-manageable");
        assertProblem(admin.post(url("/admin/accounts/" + OpaqueIdCodec.encode("a", 999_999L) + "/lock")), 404, "resource-not-found");
        assertThat(admin.get(url("/session")).getStatusCode().value()).isEqualTo(200);
    }
}
