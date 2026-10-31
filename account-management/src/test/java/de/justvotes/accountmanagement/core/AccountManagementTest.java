package de.justvotes.accountmanagement.core;

import de.justvotes.accountmanagement.core.TestSupport.MutableClock;
import de.justvotes.accountmanagement.core.TestSupport.SequentialTokens;
import de.justvotes.accountmanagement.core.exception.AccountNotManageableException;
import de.justvotes.accountmanagement.core.exception.EmailAlreadyInvitedException;
import de.justvotes.accountmanagement.core.exception.InvalidCredentialsException;
import de.justvotes.accountmanagement.core.exception.PasswordPolicyViolationException;
import de.justvotes.accountmanagement.core.model.Account;
import de.justvotes.accountmanagement.core.model.AccountId;
import de.justvotes.accountmanagement.core.model.AccountIdentity;
import de.justvotes.accountmanagement.core.model.AdminProvisioning;
import de.justvotes.accountmanagement.core.model.EmailAddress;
import de.justvotes.accountmanagement.core.model.PasswordHash;
import de.justvotes.accountmanagement.core.model.Role;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AccountManagementTest {
    private final InMemoryAccounts accounts = new InMemoryAccounts();
    private final FakePasswordHasher hasher = new FakePasswordHasher();
    private final MutableClock clock = new MutableClock();
    private final AccountManagement management = new AccountManagement(accounts, hasher, new SequentialTokens(), clock);

    private AccountId user(String name, String identity) {
        return accounts.save(Account.createUser(AccountIdentity.of(identity),
                EmailAddress.of(name + "@example.test"), hasher.hash("correct-horse-battery"), clock.now())).id().orElseThrow();
    }

    @Test
    void authenticatesCaseInsensitivelyByEmail() {
        user("Anna", "Anna");
        assertEquals("Anna@example.test", management.authenticate(" anna@EXAMPLE.test", "correct-horse-battery").email().value());
    }

    @Test
    void unknownEmailsWrongPasswordsAndLockedAccountsFailAlike() {
        AccountId anna = user("anna", "Anna");
        assertThrows(InvalidCredentialsException.class, () -> management.authenticate("nobody@example.test", "correct-horse-battery"));
        assertThrows(InvalidCredentialsException.class, () -> management.authenticate("anna@example.test", "wrong"));
        assertThrows(InvalidCredentialsException.class, () -> management.authenticate(null, "x"));
        management.lock(anna);
        assertThrows(InvalidCredentialsException.class, () -> management.authenticate("anna@example.test", "correct-horse-battery"));
    }

    @Test
    void upgradesLegacyHashesOnSuccessfulLogin() {
        management.provisionAdmin("admin@example.test", FakePasswordHasher.LEGACY_PREFIX + "short", false);
        Account admin = management.authenticate("admin@example.test", "short");
        assertFalse(hasher.needsUpgrade(admin.passwordHash()));
        assertTrue(hasher.matches("short", accounts.findAdmin().orElseThrow().passwordHash()));
    }

    @Test
    void provisionsAdminOnceAndResetsOnlyOnRequest() {
        assertEquals(AdminProvisioning.CREATED, management.provisionAdmin("admin@example.test", "{fake}first-password", false));
        assertEquals(AdminProvisioning.UNCHANGED, management.provisionAdmin("admin@example.test", "{fake}second-password", false));
        assertTrue(hasher.matches("first-password", accounts.findAdmin().orElseThrow().passwordHash()));

        assertEquals(AdminProvisioning.PASSWORD_RESET, management.provisionAdmin("admin@example.test", "{fake}second-password", true));
        Account admin = accounts.findAdmin().orElseThrow();
        assertTrue(hasher.matches("second-password", admin.passwordHash()));
        assertEquals(1, admin.sessionEpoch());
        assertEquals(Role.ADMIN, admin.role());
    }

    @Test
    void administratorFollowsAChangedEmailAndCannotTakeOverAUserAddress() {
        management.provisionAdmin("admin@example.test", "{fake}admin-password", false);
        assertEquals(AdminProvisioning.UNCHANGED, management.provisionAdmin("Root@Example.test", "{fake}other", false));
        Account admin = accounts.findAdmin().orElseThrow();
        assertEquals("Root@Example.test", admin.email().value());
        assertTrue(hasher.matches("admin-password", admin.passwordHash()));
        assertEquals(0, admin.sessionEpoch());

        user("anna", "Anna");
        assertThrows(EmailAlreadyInvitedException.class,
                () -> management.provisionAdmin("ANNA@example.test", "{fake}admin-password", false));
    }

    @Test
    void changePasswordEnforcesPolicy() {
        AccountId anna = user("anna", "Anna");
        assertThrows(PasswordPolicyViolationException.class,
                () -> management.changePassword(anna, "correct-horse-battery", "short"));
        Account changed = management.changePassword(anna, "correct-horse-battery", "a-much-longer-password");
        assertEquals(1, changed.sessionEpoch());
        assertEquals("anna@example.test", management.authenticate("anna@example.test", "a-much-longer-password").email().value());
    }

    @Test
    void oneTimePasswordIsReturnedOnceAndForcesChange() {
        AccountId anna = user("anna", "Anna");
        String oneTimePassword = management.assignOneTimePassword(anna);
        Account account = management.authenticate("anna@example.test", oneTimePassword);
        assertTrue(account.passwordChangeRequired());
        assertThrows(InvalidCredentialsException.class, () -> management.authenticate("anna@example.test", "correct-horse-battery"));
    }

    @Test
    void administratorCannotBeLockedOrGivenOneTimePassword() {
        management.provisionAdmin("admin@example.test", "{fake}admin-password", false);
        AccountId admin = accounts.findAdmin().orElseThrow().id().orElseThrow();
        assertThrows(AccountNotManageableException.class, () -> management.lock(admin));
        assertThrows(AccountNotManageableException.class, () -> management.assignOneTimePassword(admin));
        assertTrue(hasher.matches("admin-password", PasswordHash.of(accounts.findAdmin().orElseThrow().passwordHash().value())));
    }

    @Test
    void listsAdministratorFirstThenUsersByEmail() {
        user("zoe", "Zoe");
        user("anna", "Anna");
        management.provisionAdmin("admin@example.test", "{fake}admin-password", false);
        assertEquals("admin@example.test", management.accounts().get(0).email().value());
        assertEquals("anna@example.test", management.accounts().get(1).email().value());
        assertEquals("zoe@example.test", management.accounts().get(2).email().value());
    }
}
