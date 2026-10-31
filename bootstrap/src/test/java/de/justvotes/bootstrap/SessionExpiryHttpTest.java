package de.justvotes.bootstrap;

import de.justvotes.accountmanagement.core.model.Account;
import de.justvotes.bootstrap.support.AccountFixtures;
import de.justvotes.bootstrap.support.AccountHttpTestBase;
import de.justvotes.bootstrap.support.TestSession;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.support.TransactionTemplate;

import java.nio.file.Path;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
class SessionExpiryHttpTest extends AccountHttpTestBase {
    private static final Path DATABASE_PATH = Path.of("target", "session-expiry-" + UUID.randomUUID() + ".db");

    @DynamicPropertySource
    static void applicationProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:sqlite:" + DATABASE_PATH);
        registry.add("ADMIN_EMAIL", () -> "systemadmin@example.test");
        registry.add("ADMIN_PASSWORD_HASH", () -> new BCryptPasswordEncoder().encode("password"));
        registry.add("justvotes.session.max-lifetime", () -> "PT3S");
    }

    @Test
    void endsSessionsAfterTheAbsoluteLifetime() throws InterruptedException {
        TestSession user = fixtures().loginAsUser("Expiring");
        assertThat(user.get(url("/session")).getStatusCode().value()).isEqualTo(200);
        Thread.sleep(3_500);
        assertProblem(user.get(url("/session")), 401, "authentication-required");
    }

    @Test
    void endsSessionsWhoseAccountWasLockedOrWhoseEpochIsOutdated() {
        TestSession locked = fixtures().loginAsUser("Locked Later");
        TestSession outdated = fixtures().loginAsUser("Epoch Later");
        TransactionTemplate transactions = new TransactionTemplate(transactionManager);

        transactions.executeWithoutResult(status -> {
            Account account = accounts.findByEmailKey(AccountFixtures.email("Locked Later")).orElseThrow();
            account.lock(Instant.now());
            accounts.save(account);
        });
        transactions.executeWithoutResult(status -> {
            Account account = accounts.findByEmailKey(AccountFixtures.email("Epoch Later")).orElseThrow();
            account.assignOneTimePassword(hasher.hash("new-one-time-pass"), Instant.now());
            accounts.save(account);
        });

        assertProblem(locked.get(url("/polls")), 401, "authentication-required");
        assertProblem(outdated.get(url("/polls")), 401, "authentication-required");
        assertProblem(locked.get(url("/session")), 401, "authentication-required");
    }
}
