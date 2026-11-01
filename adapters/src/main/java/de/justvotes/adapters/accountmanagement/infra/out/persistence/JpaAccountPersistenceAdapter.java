package de.justvotes.adapters.accountmanagement.infra.out.persistence;

import de.justvotes.accountmanagement.core.model.Account;
import de.justvotes.accountmanagement.core.model.AccountId;
import de.justvotes.accountmanagement.core.model.Role;
import de.justvotes.accountmanagement.core.ports.out.AccountRepository;

import java.util.List;
import java.util.Optional;

public final class JpaAccountPersistenceAdapter implements AccountRepository {
    private final SpringDataAccountRepository accounts;

    public JpaAccountPersistenceAdapter(SpringDataAccountRepository accounts) {
        this.accounts = accounts;
    }

    @Override
    public Optional<Account> findById(AccountId id) {
        return accounts.findById(Math.toIntExact(id.value())).map(AccountEntity::toDomain);
    }

    @Override
    public Optional<Account> findByEmailKey(String normalizedEmail) {
        return accounts.findByEmailKey(normalizedEmail).map(AccountEntity::toDomain);
    }

    @Override
    public Optional<Account> findAdmin() {
        return accounts.findFirstByRole(Role.ADMIN.name()).map(AccountEntity::toDomain);
    }

    @Override
    public boolean existsByIdentityKey(String normalizedIdentity) {
        return accounts.existsByIdentityKey(normalizedIdentity);
    }

    @Override
    public boolean existsByEmailKey(String normalizedEmail) {
        return accounts.existsByEmailKey(normalizedEmail);
    }

    @Override
    public List<Account> findAll() {
        return accounts.findAll().stream().map(AccountEntity::toDomain).toList();
    }

    @Override
    public Account save(Account account) {
        if (account.id().isEmpty()) {
            return accounts.save(AccountEntity.from(account)).toDomain();
        }
        AccountEntity entity = accounts.findById(Math.toIntExact(account.id().get().value()))
                .orElseThrow(() -> new IllegalStateException("The account no longer exists."));
        entity.apply(account);
        return accounts.save(entity).toDomain();
    }
}
