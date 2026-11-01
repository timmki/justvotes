package de.justvotes.accountmanagement.core.ports.in;

import de.justvotes.accountmanagement.core.model.Account;
import de.justvotes.accountmanagement.core.model.AccountId;

public interface ManageOwnCredentials {
    Account changePassword(AccountId accountId, String currentPassword, String newPassword);
}
