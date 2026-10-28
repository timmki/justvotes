package de.justvotes.bootstrap;

import de.justvotes.accountmanagement.core.model.Account;
import de.justvotes.accountmanagement.core.model.AccountIdentity;
import de.justvotes.accountmanagement.core.model.AccountName;
import de.justvotes.accountmanagement.core.model.AccountStatus;
import de.justvotes.accountmanagement.core.model.EmailAddress;
import de.justvotes.accountmanagement.core.model.Invitation;
import de.justvotes.accountmanagement.core.model.InvitationToken;
import de.justvotes.accountmanagement.core.model.PasswordHash;
import de.justvotes.accountmanagement.core.ports.out.AccountRepository;
import de.justvotes.accountmanagement.core.ports.out.InvitationRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.nio.file.Path;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
class AccountPersistenceIntegrationTest {
    private static final Path DATABASE_PATH = Path.of("target", "account-persistence-" + UUID.randomUUID() + ".db");
    private static final Instant NOW = Instant.now().truncatedTo(ChronoUnit.MILLIS);

    @Autowired
    AccountRepository accounts;
    @Autowired
    InvitationRepository invitations;
    @Autowired
    PlatformTransactionManager transactionManager;
    @Autowired
    JdbcTemplate jdbc;

    @DynamicPropertySource
    static void applicationProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:sqlite:" + DATABASE_PATH);
        registry.add("ADMIN_USERNAME", () -> "systemadmin");
        registry.add("ADMIN_PASSWORD_HASH", () -> new BCryptPasswordEncoder().encode("password"));
    }

    private <T> T inTransaction(java.util.function.Supplier<T> work) {
        return new TransactionTemplate(transactionManager).execute(status -> work.get());
    }

    private Account user(String name, String identity, String email) {
        return Account.createUser(AccountName.of(name), AccountIdentity.of(identity), EmailAddress.of(email),
                PasswordHash.of("{noop}x"), NOW);
    }

    @Test
    void roundTripsAccountsAndInvitations() {
        Account saved = inTransaction(() -> accounts.save(user("Round.Trip", "Round Trip", "Round@Example.test")));
        saved.lock(NOW);
        inTransaction(() -> accounts.save(saved));

        Account loaded = inTransaction(() -> accounts.findByNameKey("round.trip")).orElseThrow();
        assertThat(loaded.name().value()).isEqualTo("Round.Trip");
        assertThat(loaded.identity().orElseThrow().value()).isEqualTo("Round Trip");
        assertThat(loaded.status()).isEqualTo(AccountStatus.LOCKED);
        assertThat(loaded.sessionEpoch()).isEqualTo(1);
        assertThat(accounts.existsByIdentityKey("round trip")).isTrue();
        assertThat(accounts.existsByEmailKey("round@example.test")).isTrue();

        InvitationToken token = InvitationToken.of("persisted-token");
        Invitation invitation = inTransaction(() -> invitations.save(Invitation.issue(EmailAddress.of("new@example.test"), token.hash(), NOW)));
        invitation.recordDelivery(false);
        inTransaction(() -> invitations.save(invitation));
        Invitation reloaded = inTransaction(() -> invitations.findByTokenHash(token.hash())).orElseThrow();
        assertThat(reloaded.deliveryFailed()).isTrue();
        assertThat(reloaded.expiresAt()).isEqualTo(NOW.plus(Invitation.VALIDITY));
        assertThat(invitations.existsOpenByEmailKey("new@example.test")).isTrue();
    }

    @Test
    void enforcesUniqueNamesIdentitiesAndEmailsIgnoringCase() {
        inTransaction(() -> accounts.save(user("unique", "Unique", "unique@example.test")));
        assertThatThrownBy(() -> inTransaction(() -> accounts.save(user("UNIQUE", "Other", "other@example.test"))))
                .isInstanceOf(DataAccessException.class).hasMessageContaining("constraint failed");
        assertThatThrownBy(() -> inTransaction(() -> accounts.save(user("other1", "UNIQUE", "other1@example.test"))))
                .isInstanceOf(DataAccessException.class).hasMessageContaining("constraint failed");
        assertThatThrownBy(() -> inTransaction(() -> accounts.save(user("other2", "Other2", "UNIQUE@example.test"))))
                .isInstanceOf(DataAccessException.class).hasMessageContaining("constraint failed");
    }

    @Test
    void allowsOnlyOneAdministratorAndEnforcesRoleShapes() {
        assertThat(accounts.findAdmin()).isPresent();
        assertThatThrownBy(() -> inTransaction(() -> accounts.save(Account.createAdmin(AccountName.of("second-admin"),
                PasswordHash.of("{noop}x"), NOW)))).isInstanceOf(DataAccessException.class).hasMessageContaining("constraint failed");
        assertThatThrownBy(() -> jdbc.update("INSERT INTO \"Account\" (name, \"nameKey\", role, status, \"passwordHash\", \"createdAt\", \"updatedAt\") "
                + "VALUES ('shape', 'shape', 'USER', 'ACTIVE', 'x', 'now', 'now')")).isInstanceOf(DataAccessException.class).hasMessageContaining("constraint failed");
    }
}
