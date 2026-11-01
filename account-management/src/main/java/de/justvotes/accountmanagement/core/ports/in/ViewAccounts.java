package de.justvotes.accountmanagement.core.ports.in;

import de.justvotes.accountmanagement.core.model.Account;
import de.justvotes.accountmanagement.core.model.AccountId;

import java.util.List;
import java.util.Optional;

public interface ViewAccounts {
    List<Account> accounts();

    Optional<Account> account(AccountId id);
}
