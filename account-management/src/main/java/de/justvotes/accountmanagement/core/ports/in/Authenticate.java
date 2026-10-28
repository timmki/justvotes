package de.justvotes.accountmanagement.core.ports.in;

import de.justvotes.accountmanagement.core.model.Account;

public interface Authenticate {
    /**
     * Returns the active account for valid credentials; unknown names, wrong passwords and locked
     * accounts all fail with the same exception.
     */
    Account authenticate(String accountName, String rawPassword);
}
