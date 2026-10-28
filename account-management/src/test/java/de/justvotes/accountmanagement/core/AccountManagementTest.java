package de.justvotes.accountmanagement.core;

import de.justvotes.accountmanagement.core.TestSupport.MutableClock;
import de.justvotes.accountmanagement.core.TestSupport.SequentialTokens;
import de.justvotes.accountmanagement.core.exception.AccountNotManageableException;
import de.justvotes.accountmanagement.core.exception.InvalidCredentialsException;
import de.justvotes.accountmanagement.core.exception.PasswordPolicyViolationException;
import de.justvotes.accountmanagement.core.model.Account;
import de.justvotes.accountmanagement.core.model.AccountId;
import de.justvotes.accountmanagement.core.model.AccountIdentity;
import de.justvotes.accountmanagement.core.model.AccountName;
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
        return accounts.save(Account.createUser(AccountName.of(name), AccountIdentity.of(identity),
                EmailAddress.of(name + "@example.test"), hasher.hash("correct-horse-battery"), clock.now())).id().orElseThrow();
    }

    @Test
    void authenticatesCaseInsensitivelyByName() {
        user("Anna", "Anna");
        assertEquals("Anna", management.authenticate("anna", "correct-horse-battery").name().value());
    }

    @Test
    void unknownNamesWrongPasswordsAndLockedAccountsFailAlike() {
        AccountId anna = user("anna", "Anna");
        assertThrows(InvalidCredentialsException.class, () -> management.authenticate("nobody", "correct-horse-battery"));
        assertThrows(InvalidCredentialsException.class, () -> management.authenticate("anna", "wrong"));
        assertThrows(InvalidCredentialsException.class, () -> management.authenticate(null, "x"));
        management.lock(anna);
        assertThrows(InvalidCredentialsException.class, () -> management.authenticate("anna", "correct-horse-battery"));
    }

    @Test
    void upgradesLegacyHashesOnSuccessfulLogin() {
        management.provisionAdmin("admin", FakePasswordHasher.LEGACY_PREFIX + "short", false);
        Account admin = management.authenticate("admin", "short");
        assertFalse(hasher.needsUpgrade(admin.passwordHash()));
        assertTrue(hasher.matches("short", accounts.findAdmin().orElseThrow().passwordHash()));
    }

    @Test
    void provisionsAdminOnceAndResetsOnlyOnRequest() {
        assertEquals(AdminProvisioning.CREATED, management.provisionAdmin("admin", "{fake}first-password", false));
        assertEquals(AdminProvisioning.UNCHANGED, management.provisionAdmin("admin", "{fake}second-password", false));
        assertTrue(hasher.matches("first-password", accounts.findAdmin().orElseThrow().passwordHash()));

        assertEquals(AdminProvisioning.PASSWORD_RESET, management.provisionAdmin("admin", "{fake}second-password", true));
        Account admin = accounts.findAdmin().orElseThrow();
        assertTrue(hasher.matches("second-password", admin.passwordHash()));
        assertEquals(1, admin.sessionEpoch());
        assertEquals(Role.ADMIN, admin.role());
    }

    @Test
    void changePasswordEnforcesPolicy() {
        AccountId anna = user("anna", "Anna");
        assertThrows(PasswordPolicyViolationException.class,
                () -> management.changePassword(anna, "correct-horse-battery", "short"));
        Account changed = management.changePassword(anna, "correct-horse-battery", "a-much-longer-password");
        assertEquals(1, changed.sessionEpoch());
        assertEquals("anna", management.authenticate("anna", "a-much-longer-password").name().value());
    }

    @Test
    void oneTimePasswordIsReturnedOnceAndForcesChange() {
        AccountId anna = user("anna", "Anna");
        String oneTimePassword = management.assignOneTimePassword(anna);
        Account account = management.authenticate("anna", oneTimePassword);
        assertTrue(account.passwordChangeRequired());
        assertThrows(InvalidCredentialsException.class, () -> management.authenticate("anna", "correct-horse-battery"));
    }

    @Test
    void administratorCannotBeLockedOrGivenOneTimePassword() {
        management.provisionAdmin("admin", "{fake}admin-password", false);
        AccountId admin = accounts.findAdmin().orElseThrow().id().orElseThrow();
        assertThrows(AccountNotManageableException.class, () -> management.lock(admin));
        assertThrows(AccountNotManageableException.class, () -> management.assignOneTimePassword(admin));
        assertTrue(hasher.matches("admin-password", PasswordHash.of(accounts.findAdmin().orElseThrow().passwordHash().value())));
    }

    @Test
    void listsAdministratorFirstThenUsersByName() {
        user("zoe", "Zoe");
        user("anna", "Anna");
        management.provisionAdmin("admin", "{fake}admin-password", false);
        assertEquals("admin", management.accounts().get(0).name().value());
        assertEquals("anna", management.accounts().get(1).name().value());
        assertEquals("zoe", management.accounts().get(2).name().value());
    }
}
