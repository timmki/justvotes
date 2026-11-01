package de.justvotes.accountmanagement.core.model;

import de.justvotes.accountmanagement.core.FakePasswordHasher;
import de.justvotes.accountmanagement.core.exception.AccountNotManageableException;
import de.justvotes.accountmanagement.core.exception.CurrentPasswordInvalidException;
import de.justvotes.accountmanagement.core.exception.PasswordPolicyViolationException;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AccountTest {
    private static final Instant NOW = Instant.parse("2026-10-27T10:00:00Z");
    private static final Instant LATER = Instant.parse("2026-10-27T11:00:00Z");
    private final FakePasswordHasher hasher = new FakePasswordHasher();

    private Account user() {
        return Account.createUser(AccountIdentity.of("Anna"), EmailAddress.of("anna@example.test"),
                hasher.hash("correct-horse-battery"), NOW);
    }

    private Account admin() {
        return Account.createAdmin(EmailAddress.of("admin@example.test"), hasher.hash("admin-password"), NOW);
    }

    @Test
    void userAccountsOwnIdentityAndEmail() {
        Account account = user();
        assertEquals(Role.USER, account.role());
        assertEquals("Anna", account.identity().orElseThrow().value());
        assertEquals("anna@example.test", account.email().value());
        assertEquals(AccountStatus.ACTIVE, account.status());
        assertEquals(0, account.sessionEpoch());
    }

    @Test
    void administratorHasAnEmailButNoIdentityAndIsAlwaysActive() {
        Account account = admin();
        assertTrue(account.identity().isEmpty());
        assertEquals("admin@example.test", account.email().value());
        EmailAddress email = EmailAddress.of("admin@example.test");
        assertThrows(IllegalArgumentException.class, () -> Account.restore(AccountId.of(1),
                Role.ADMIN, null, email, AccountStatus.LOCKED, hasher.hash("x"), false, 0, NOW, NOW));
        assertThrows(IllegalArgumentException.class, () -> Account.restore(AccountId.of(1),
                Role.ADMIN, AccountIdentity.of("admin"), email, AccountStatus.ACTIVE, hasher.hash("x"), false, 0, NOW, NOW));
        assertThrows(NullPointerException.class, () -> Account.restore(AccountId.of(1),
                Role.ADMIN, null, null, AccountStatus.ACTIVE, hasher.hash("x"), false, 0, NOW, NOW));
    }

    @Test
    void administratorEmailFollowsTheConfiguration() {
        Account account = admin();
        account.changeAdminEmail(EmailAddress.of("root@example.test"), LATER);
        assertEquals("root@example.test", account.email().value());
        assertEquals(0, account.sessionEpoch());
        assertThrows(AccountNotManageableException.class, () -> user().changeAdminEmail(EmailAddress.of("x@example.test"), LATER));
    }

    @Test
    void userAccountsRequireIdentityAndEmail() {
        assertThrows(IllegalArgumentException.class, () -> Account.restore(AccountId.of(2),
                Role.USER, null, EmailAddress.of("a@b.de"), AccountStatus.ACTIVE, hasher.hash("x"), false, 0, NOW, NOW));
        assertThrows(NullPointerException.class, () -> Account.restore(AccountId.of(2),
                Role.USER, AccountIdentity.of("Anna"), null, AccountStatus.ACTIVE, hasher.hash("x"), false, 0, NOW, NOW));
    }

    @Test
    void lockedAccountsFailLoginLikeWrongPasswords() {
        Account account = user();
        assertTrue(account.verifyLogin("correct-horse-battery", hasher));
        assertFalse(account.verifyLogin("wrong-password", hasher));
        account.lock(LATER);
        assertFalse(account.verifyLogin("correct-horse-battery", hasher));
    }

    @Test
    void changePasswordRequiresCorrectCurrentPasswordAndIncrementsEpoch() {
        Account account = user();
        assertThrows(CurrentPasswordInvalidException.class,
                () -> account.changePassword("wrong", Password.of("new-password-123"), hasher, LATER));
        assertThrows(PasswordPolicyViolationException.class,
                () -> account.changePassword("correct-horse-battery", Password.of("correct-horse-battery"), hasher, LATER));

        account.changePassword("correct-horse-battery", Password.of("new-password-123"), hasher, LATER);

        assertTrue(account.verifyLogin("new-password-123", hasher));
        assertFalse(account.verifyLogin("correct-horse-battery", hasher));
        assertEquals(1, account.sessionEpoch());
        assertFalse(account.passwordChangeRequired());
        assertEquals(LATER, account.updatedAt());
    }

    @Test
    void oneTimePasswordRequiresChangeAndEndsSessions() {
        Account account = user();
        account.assignOneTimePassword(hasher.hash("one-time-pass-16"), LATER);
        assertTrue(account.passwordChangeRequired());
        assertEquals(1, account.sessionEpoch());

        account.changePassword("one-time-pass-16", Password.of("my-own-password"), hasher, LATER);
        assertFalse(account.passwordChangeRequired());
        assertEquals(2, account.sessionEpoch());
    }

    @Test
    void lockAndUnlockOnlyApplyToUsers() {
        Account account = user();
        account.lock(LATER);
        assertEquals(AccountStatus.LOCKED, account.status());
        assertEquals(1, account.sessionEpoch());
        account.lock(LATER);
        assertEquals(1, account.sessionEpoch());
        account.unlock(LATER);
        assertEquals(AccountStatus.ACTIVE, account.status());
        assertEquals(1, account.sessionEpoch());

        Account administrator = admin();
        assertThrows(AccountNotManageableException.class, () -> administrator.lock(LATER));
        assertThrows(AccountNotManageableException.class, () -> administrator.unlock(LATER));
        assertThrows(AccountNotManageableException.class,
                () -> administrator.assignOneTimePassword(hasher.hash("x"), LATER));
    }

    @Test
    void lockedAccountsCannotChangeTheirPassword() {
        Account account = user();
        account.lock(LATER);
        assertThrows(CurrentPasswordInvalidException.class,
                () -> account.changePassword("correct-horse-battery", Password.of("new-password-123"), hasher, LATER));
    }

    @Test
    void adminPasswordResetIncrementsEpochAndIsAdminOnly() {
        Account administrator = admin();
        administrator.resetAdminPassword(hasher.hash("other-admin-pass"), LATER);
        assertTrue(administrator.verifyLogin("other-admin-pass", hasher));
        assertEquals(1, administrator.sessionEpoch());
        assertThrows(AccountNotManageableException.class, () -> user().resetAdminPassword(hasher.hash("x"), LATER));
    }
}
