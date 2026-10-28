package de.justvotes.accountmanagement.core;

import de.justvotes.accountmanagement.core.model.Account;
import de.justvotes.accountmanagement.core.model.AccountId;
import de.justvotes.accountmanagement.core.model.Role;
import de.justvotes.accountmanagement.core.ports.out.AccountRepository;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

final class InMemoryAccounts implements AccountRepository {
    private final Map<Long, Account> accounts = new LinkedHashMap<>();
    private long nextId = 1;

    @Override
    public Optional<Account> findById(AccountId id) {
        return Optional.ofNullable(accounts.get(id.value()));
    }

    @Override
    public Optional<Account> findByNameKey(String normalizedName) {
        return accounts.values().stream().filter(account -> account.name().normalized().equals(normalizedName)).findFirst();
    }

    @Override
    public Optional<Account> findAdmin() {
        return accounts.values().stream().filter(account -> account.role() == Role.ADMIN).findFirst();
    }

    @Override
    public boolean existsByNameKey(String normalizedName) {
        return findByNameKey(normalizedName).isPresent();
    }

    @Override
    public boolean existsByIdentityKey(String normalizedIdentity) {
        return accounts.values().stream().anyMatch(account -> account.identity()
                .map(identity -> identity.normalized().equals(normalizedIdentity)).orElse(false));
    }

    @Override
    public boolean existsByEmailKey(String normalizedEmail) {
        return accounts.values().stream().anyMatch(account -> account.email()
                .map(email -> email.normalized().equals(normalizedEmail)).orElse(false));
    }

    @Override
    public List<Account> findAll() {
        return new ArrayList<>(accounts.values());
    }

    @Override
    public Account save(Account account) {
        if (account.id().isPresent()) {
            accounts.put(account.id().get().value(), account);
            return account;
        }
        long id = nextId++;
        Account stored = Account.restore(AccountId.of(id), account.name(), account.role(), account.identity().orElse(null),
                account.email().orElse(null), account.status(), account.passwordHash(), account.passwordChangeRequired(),
                account.sessionEpoch(), account.createdAt(), account.updatedAt());
        accounts.put(id, stored);
        return stored;
    }
}
