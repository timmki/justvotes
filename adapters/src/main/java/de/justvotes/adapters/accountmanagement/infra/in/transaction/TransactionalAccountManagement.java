package de.justvotes.adapters.accountmanagement.infra.in.transaction;

import de.justvotes.accountmanagement.core.AccountManagement;
import de.justvotes.accountmanagement.core.model.Account;
import de.justvotes.accountmanagement.core.model.AccountId;
import de.justvotes.accountmanagement.core.model.AdminProvisioning;
import de.justvotes.accountmanagement.core.ports.in.Authenticate;
import de.justvotes.accountmanagement.core.ports.in.ManageAccounts;
import de.justvotes.accountmanagement.core.ports.in.ManageOwnCredentials;
import de.justvotes.accountmanagement.core.ports.in.ProvisionAdmin;
import de.justvotes.accountmanagement.core.ports.in.ViewAccounts;
import de.justvotes.adapters.sqlite.SqliteRetryingTransaction;

import java.util.List;
import java.util.Optional;

public class TransactionalAccountManagement implements Authenticate, ViewAccounts, ManageOwnCredentials, ManageAccounts,
        ProvisionAdmin {
    private final AccountManagement accounts;
    private final SqliteRetryingTransaction transactions;

    public TransactionalAccountManagement(AccountManagement accounts, SqliteRetryingTransaction transactions) {
        this.accounts = accounts;
        this.transactions = transactions;
    }

    @Override
    public Account authenticate(String email, String rawPassword) {
        return transactions.execute(() -> accounts.authenticate(email, rawPassword));
    }

    @Override
    public List<Account> accounts() {
        return transactions.executeReadOnly(accounts::accounts);
    }

    @Override
    public Optional<Account> account(AccountId id) {
        return transactions.executeReadOnly(() -> accounts.account(id));
    }

    @Override
    public Account changePassword(AccountId accountId, String currentPassword, String newPassword) {
        return transactions.execute(() -> accounts.changePassword(accountId, currentPassword, newPassword));
    }

    @Override
    public Account lock(AccountId accountId) {
        return transactions.execute(() -> accounts.lock(accountId));
    }

    @Override
    public Account unlock(AccountId accountId) {
        return transactions.execute(() -> accounts.unlock(accountId));
    }

    @Override
    public String assignOneTimePassword(AccountId accountId) {
        return transactions.execute(() -> accounts.assignOneTimePassword(accountId));
    }

    @Override
    public AdminProvisioning provisionAdmin(String email, String passwordHash, boolean resetPassword) {
        return transactions.execute(() -> accounts.provisionAdmin(email, passwordHash, resetPassword));
    }
}
