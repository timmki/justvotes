package de.justvotes.accountmanagement.core;

import de.justvotes.accountmanagement.core.exception.AccountNotFoundException;
import de.justvotes.accountmanagement.core.exception.EmailAlreadyInvitedException;
import de.justvotes.accountmanagement.core.exception.InvalidCredentialsException;
import de.justvotes.accountmanagement.core.exception.PasswordPolicyViolationException;
import de.justvotes.accountmanagement.core.model.Account;
import de.justvotes.accountmanagement.core.model.AccountId;
import de.justvotes.accountmanagement.core.model.AdminProvisioning;
import de.justvotes.accountmanagement.core.model.EmailAddress;
import de.justvotes.accountmanagement.core.model.Password;
import de.justvotes.accountmanagement.core.model.PasswordHash;
import de.justvotes.accountmanagement.core.model.Role;
import de.justvotes.accountmanagement.core.ports.in.Authenticate;
import de.justvotes.accountmanagement.core.ports.in.ManageAccounts;
import de.justvotes.accountmanagement.core.ports.in.ManageOwnCredentials;
import de.justvotes.accountmanagement.core.ports.in.ProvisionAdmin;
import de.justvotes.accountmanagement.core.ports.in.ViewAccounts;
import de.justvotes.accountmanagement.core.ports.out.AccountRepository;
import de.justvotes.accountmanagement.core.ports.out.PasswordHasher;
import de.justvotes.accountmanagement.core.ports.out.TokenGenerator;
import de.justvotes.accountmanagement.core.ports.out.UtcClock;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

public final class AccountManagement implements Authenticate, ViewAccounts, ManageOwnCredentials, ManageAccounts,
        ProvisionAdmin {
    private static final String TIMING_DUMMY_PASSWORD = "timing-equalization-dummy-password";

    private final AccountRepository accounts;
    private final PasswordHasher hasher;
    private final TokenGenerator tokens;
    private final UtcClock clock;
    private final PasswordHash timingDummy;

    public AccountManagement(AccountRepository accounts, PasswordHasher hasher, TokenGenerator tokens, UtcClock clock) {
        this.accounts = accounts;
        this.hasher = hasher;
        this.tokens = tokens;
        this.clock = clock;
        this.timingDummy = hasher.hash(TIMING_DUMMY_PASSWORD);
    }

    static Password newPassword(String value) {
        try {
            return Password.of(value);
        } catch (IllegalArgumentException exception) {
            throw new PasswordPolicyViolationException(exception.getMessage());
        }
    }

    @Override
    public Account authenticate(String email, String rawPassword) {
        if (rawPassword == null) {
            throw new InvalidCredentialsException();
        }
        Optional<Account> candidate = Optional.empty();
        if (email != null) {
            candidate = accounts.findByEmailKey(email.strip().toLowerCase(Locale.ROOT));
        }
        if (candidate.isEmpty()) {
            hasher.matches(rawPassword, timingDummy);
            throw new InvalidCredentialsException();
        }
        Account account = candidate.get();
        if (!account.verifyLogin(rawPassword, hasher)) {
            throw new InvalidCredentialsException();
        }
        if (hasher.needsUpgrade(account.passwordHash())) {
            account.upgradePasswordHash(hasher.hash(rawPassword), clock.now());
            account = accounts.save(account);
        }
        return account;
    }

    @Override
    public List<Account> accounts() {
        return accounts.findAll().stream()
                .sorted(Comparator.comparing((Account account) -> account.role().ordinal()).reversed()
                        .thenComparing(account -> account.email().normalized()))
                .toList();
    }

    @Override
    public Optional<Account> account(AccountId id) {
        return accounts.findById(id);
    }

    @Override
    public Account changePassword(AccountId accountId, String currentPassword, String newPassword) {
        Account account = load(accountId);
        Password password = newPassword(newPassword);
        account.changePassword(currentPassword, password, hasher, clock.now());
        return accounts.save(account);
    }

    @Override
    public Account lock(AccountId accountId) {
        Account account = load(accountId);
        account.lock(clock.now());
        return accounts.save(account);
    }

    @Override
    public Account unlock(AccountId accountId) {
        Account account = load(accountId);
        account.unlock(clock.now());
        return accounts.save(account);
    }

    @Override
    public String assignOneTimePassword(AccountId accountId) {
        Account account = load(accountId);
        String oneTimePassword = tokens.oneTimePassword();
        account.assignOneTimePassword(hasher.hash(oneTimePassword), clock.now());
        accounts.save(account);
        return oneTimePassword;
    }

    @Override
    public AdminProvisioning provisionAdmin(String email, String passwordHash, boolean resetPassword) {
        EmailAddress adminEmail = EmailAddress.of(email);
        PasswordHash hash = PasswordHash.of(passwordHash);
        Instant now = clock.now();
        Optional<Account> existing = accounts.findAdmin();
        Optional<Account> owner = accounts.findByEmailKey(adminEmail.normalized());
        if (owner.isPresent() && owner.get().role() != Role.ADMIN) {
            throw new EmailAlreadyInvitedException();
        }
        if (existing.isEmpty()) {
            accounts.save(Account.createAdmin(adminEmail, hash, now));
            return AdminProvisioning.CREATED;
        }
        Account admin = existing.get();
        boolean emailChanged = !admin.email().equals(adminEmail);
        if (emailChanged) {
            admin.changeAdminEmail(adminEmail, now);
        }
        if (resetPassword) {
            admin.resetAdminPassword(hash, now);
        }
        if (emailChanged || resetPassword) {
            accounts.save(admin);
        }
        if (resetPassword) {
            return AdminProvisioning.PASSWORD_RESET;
        }
        return AdminProvisioning.UNCHANGED;
    }

    private Account load(AccountId accountId) {
        return accounts.findById(accountId).orElseThrow(AccountNotFoundException::new);
    }
}
