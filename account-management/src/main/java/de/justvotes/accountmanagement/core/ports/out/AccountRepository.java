package de.justvotes.accountmanagement.core.ports.out;

import de.justvotes.accountmanagement.core.model.Account;
import de.justvotes.accountmanagement.core.model.AccountId;

import java.util.List;
import java.util.Optional;

public interface AccountRepository {
    Optional<Account> findById(AccountId id);

    Optional<Account> findByEmailKey(String normalizedEmail);

    Optional<Account> findAdmin();

    boolean existsByIdentityKey(String normalizedIdentity);

    boolean existsByEmailKey(String normalizedEmail);

    List<Account> findAll();

    Account save(Account account);
}
