package de.justvotes.adapters.accountmanagement.infra.out.persistence;

import de.justvotes.accountmanagement.core.model.Account;
import de.justvotes.accountmanagement.core.model.AccountId;
import de.justvotes.accountmanagement.core.model.AccountIdentity;
import de.justvotes.accountmanagement.core.model.AccountStatus;
import de.justvotes.accountmanagement.core.model.EmailAddress;
import de.justvotes.accountmanagement.core.model.PasswordHash;
import de.justvotes.accountmanagement.core.model.Role;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "Account")
public class AccountEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    private String role;
    private String identity;
    @Column(name = "identityKey")
    private String identityKey;
    private String email;
    @Column(name = "emailKey")
    private String emailKey;
    private String status;
    @Column(name = "passwordHash")
    private String passwordHash;
    @Column(name = "passwordChangeRequired")
    private int passwordChangeRequired;
    @Column(name = "sessionEpoch")
    private int sessionEpoch;
    @Column(name = "createdAt", updatable = false)
    private String createdAt;
    @Column(name = "updatedAt")
    private String updatedAt;

    protected AccountEntity() {
    }

    static AccountEntity from(Account account) {
        AccountEntity entity = new AccountEntity();
        entity.createdAt = account.createdAt().toString();
        entity.apply(account);
        return entity;
    }

    /**
     * SQLite has no boolean type; flags are stored as 0 or 1.
     */
    static int flag(boolean value) {
        if (value) {
            return 1;
        }
        return 0;
    }

    void apply(Account account) {
        role = account.role().name();
        identity = account.identity().map(AccountIdentity::value).orElse(null);
        identityKey = account.identity().map(AccountIdentity::normalized).orElse(null);
        email = account.email().value();
        emailKey = account.email().normalized();
        status = account.status().name();
        passwordHash = account.passwordHash().value();
        passwordChangeRequired = flag(account.passwordChangeRequired());
        sessionEpoch = account.sessionEpoch();
        updatedAt = account.updatedAt().toString();
    }

    Account toDomain() {
        AccountIdentity accountIdentity = null;
        if (identity != null) {
            accountIdentity = AccountIdentity.of(identity);
        }
        return Account.restore(AccountId.of(id), Role.valueOf(role), accountIdentity, EmailAddress.of(email),
                AccountStatus.valueOf(status), PasswordHash.of(passwordHash), passwordChangeRequired != 0, sessionEpoch,
                Instant.parse(createdAt), Instant.parse(updatedAt));
    }
}
