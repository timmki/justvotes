package de.justvotes.accountmanagement.core.ports.in;

import de.justvotes.accountmanagement.core.model.Account;
import de.justvotes.accountmanagement.core.model.AccountId;

public interface ManageAccounts {
    Account lock(AccountId accountId);

    Account unlock(AccountId accountId);

    /**
     * Sets a generated one-time password and returns it once in plain text.
     */
    String assignOneTimePassword(AccountId accountId);
}
