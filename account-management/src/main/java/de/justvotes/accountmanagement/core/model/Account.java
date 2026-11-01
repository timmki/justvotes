package de.justvotes.accountmanagement.core.model;

import de.justvotes.accountmanagement.core.exception.AccountNotManageableException;
import de.justvotes.accountmanagement.core.exception.CurrentPasswordInvalidException;
import de.justvotes.accountmanagement.core.exception.PasswordPolicyViolationException;
import de.justvotes.accountmanagement.core.ports.out.PasswordHasher;

import java.time.Instant;
import java.util.Objects;
import java.util.Optional;

/**
 * A local account, signed in with its unique email address. User accounts also own exactly one fixed
 * identity; the single administrator account owns none and can never be locked.
 */
public final class Account {
    private final AccountId id;
    private final Role role;
    private final AccountIdentity identity;
    private EmailAddress email;
    private final Instant createdAt;
    private AccountStatus status;
    private PasswordHash passwordHash;
    private boolean passwordChangeRequired;
    private int sessionEpoch;
    private Instant updatedAt;

    private Account(AccountId id, Role role, AccountIdentity identity, EmailAddress email,
                    AccountStatus status, PasswordHash passwordHash, boolean passwordChangeRequired,
                    int sessionEpoch, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.email = Objects.requireNonNull(email, "An account requires an email address.");
        this.role = Objects.requireNonNull(role, "An account requires a role.");
        this.status = Objects.requireNonNull(status, "An account requires a status.");
        this.passwordHash = Objects.requireNonNull(passwordHash, "An account requires a password hash.");
        this.createdAt = Objects.requireNonNull(createdAt, "An account requires a creation time.");
        this.updatedAt = Objects.requireNonNull(updatedAt, "An account requires an update time.");
        if (sessionEpoch < 0) {
            throw new IllegalArgumentException("A session epoch must not be negative.");
        }
        if (role == Role.USER && identity == null) {
            throw new IllegalArgumentException("A user account requires an identity.");
        }
        if (role == Role.ADMIN && identity != null) {
            throw new IllegalArgumentException("The administrator account has no identity.");
        }
        if (role == Role.ADMIN && status != AccountStatus.ACTIVE) {
            throw new IllegalArgumentException("The administrator account is always active.");
        }
        this.identity = identity;
        this.passwordChangeRequired = passwordChangeRequired;
        this.sessionEpoch = sessionEpoch;
    }

    public static Account createUser(AccountIdentity identity, EmailAddress email, PasswordHash passwordHash, Instant now) {
        return new Account(null, Role.USER, identity, email, AccountStatus.ACTIVE, passwordHash,
                false, 0, now, now);
    }

    public static Account createAdmin(EmailAddress email, PasswordHash passwordHash, Instant now) {
        return new Account(null, Role.ADMIN, null, email, AccountStatus.ACTIVE, passwordHash,
                false, 0, now, now);
    }

    public static Account restore(AccountId id, Role role, AccountIdentity identity,
                                  EmailAddress email, AccountStatus status, PasswordHash passwordHash,
                                  boolean passwordChangeRequired, int sessionEpoch, Instant createdAt,
                                  Instant updatedAt) {
        Objects.requireNonNull(id, "A restored account requires an ID.");
        return new Account(id, role, identity, email, status, passwordHash, passwordChangeRequired,
                sessionEpoch, createdAt, updatedAt);
    }

    /**
     * Checks a login attempt. A locked account fails exactly like a wrong password.
     */
    public boolean verifyLogin(String rawPassword, PasswordHasher hasher) {
        boolean matches = hasher.matches(rawPassword, passwordHash);
        return matches && status == AccountStatus.ACTIVE;
    }

    public void upgradePasswordHash(PasswordHash upgraded, Instant now) {
        passwordHash = Objects.requireNonNull(upgraded, "An upgraded password hash is required.");
        updatedAt = now;
    }

    public void changePassword(String currentPassword, Password newPassword, PasswordHasher hasher, Instant now) {
        if (status != AccountStatus.ACTIVE || !hasher.matches(currentPassword, passwordHash)) {
            throw new CurrentPasswordInvalidException();
        }
        if (newPassword.value().equals(currentPassword)) {
            throw new PasswordPolicyViolationException("The new password must differ from the current password.");
        }
        passwordHash = hasher.hash(newPassword.value());
        passwordChangeRequired = false;
        sessionEpoch++;
        updatedAt = now;
    }

    public void assignOneTimePassword(PasswordHash oneTimePasswordHash, Instant now) {
        requireUser();
        passwordHash = Objects.requireNonNull(oneTimePasswordHash, "A one-time password hash is required.");
        passwordChangeRequired = true;
        sessionEpoch++;
        updatedAt = now;
    }

    public void lock(Instant now) {
        requireUser();
        if (status == AccountStatus.LOCKED) {
            return;
        }
        status = AccountStatus.LOCKED;
        sessionEpoch++;
        updatedAt = now;
    }

    public void unlock(Instant now) {
        requireUser();
        if (status == AccountStatus.ACTIVE) {
            return;
        }
        status = AccountStatus.ACTIVE;
        updatedAt = now;
    }

    public void resetAdminPassword(PasswordHash newHash, Instant now) {
        if (role != Role.ADMIN) {
            throw new AccountNotManageableException();
        }
        passwordHash = Objects.requireNonNull(newHash, "A password hash is required.");
        sessionEpoch++;
        updatedAt = now;
    }

    /**
     * Follows a changed ADMIN_EMAIL; existing sessions stay valid because the account itself is unchanged.
     */
    public void changeAdminEmail(EmailAddress newEmail, Instant now) {
        if (role != Role.ADMIN) {
            throw new AccountNotManageableException();
        }
        email = Objects.requireNonNull(newEmail, "An email address is required.");
        updatedAt = now;
    }

    private void requireUser() {
        if (role != Role.USER) {
            throw new AccountNotManageableException();
        }
    }

    public Optional<AccountId> id() {
        return Optional.ofNullable(id);
    }

    public Role role() {
        return role;
    }

    public Optional<AccountIdentity> identity() {
        return Optional.ofNullable(identity);
    }

    public EmailAddress email() {
        return email;
    }

    public AccountStatus status() {
        return status;
    }

    public PasswordHash passwordHash() {
        return passwordHash;
    }

    public boolean passwordChangeRequired() {
        return passwordChangeRequired;
    }

    public int sessionEpoch() {
        return sessionEpoch;
    }

    public Instant createdAt() {
        return createdAt;
    }

    public Instant updatedAt() {
        return updatedAt;
    }
}
