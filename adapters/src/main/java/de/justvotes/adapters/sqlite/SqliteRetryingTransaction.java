package de.justvotes.adapters.sqlite;

import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.function.Supplier;

/**
 * Runs each retry attempt in a separate transaction.
 */
public final class SqliteRetryingTransaction {
    private final TransactionTemplate transactions;
    private final TransactionTemplate readOnlyTransactions;

    public SqliteRetryingTransaction(PlatformTransactionManager transactionManager) {
        transactions = new TransactionTemplate(transactionManager);
        readOnlyTransactions = new TransactionTemplate(transactionManager);
        readOnlyTransactions.setReadOnly(true);
    }

    public <T> T execute(Supplier<T> work) {
        return SqliteBusyRetry.executeTransaction(transactions, work);
    }

    public <T> T executeReadOnly(Supplier<T> work) {
        return SqliteBusyRetry.executeTransaction(readOnlyTransactions, work);
    }
}
