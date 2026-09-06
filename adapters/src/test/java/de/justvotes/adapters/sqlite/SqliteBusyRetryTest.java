package de.justvotes.adapters.sqlite;

import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionOperations;

import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;

class SqliteBusyRetryTest {
    @Test
    void retriesSqliteBusyByErrorCode() throws SQLException {
        AtomicInteger attempts = new AtomicInteger();

        String result = SqliteBusyRetry.execute(() -> {
            if (attempts.incrementAndGet() < 3) {
                throw new SQLException("busy", "", 5);
            }
            return "ok";
        }, ignored -> {
        });

        assertEquals("ok", result);
        assertEquals(3, attempts.get());
    }

    @Test
    void retriesSqliteLockedByErrorCode() throws SQLException {
        AtomicInteger attempts = new AtomicInteger();

        SqliteBusyRetry.execute(() -> {
            if (attempts.incrementAndGet() < 2) {
                throw new SQLException("locked", "", 6);
            }
            return null;
        }, ignored -> {
        });

        assertEquals(2, attempts.get());
    }

    @Test
    void stopsAfterFiveAttempts() {
        FakeTransactions transactions = new FakeTransactions(Integer.MAX_VALUE);
        List<Long> waits = new ArrayList<>();

        assertThrows(RuntimeException.class, () -> SqliteBusyRetry.executeTransaction(
                transactions, () -> "unreachable", waits::add));

        assertEquals(5, transactions.attempts);
         assertEquals(List.of(500L, 1_000L, 2_000L, 4_000L), waits);
    }

    @Test
    void retriesTransactionsWithAConcreteNewAttemptEachTime() {
        FakeTransactions transactions = new FakeTransactions(2);

        String result = SqliteBusyRetry.executeTransaction(transactions, () -> "ok", ignored -> {
        });

        assertEquals("ok", result);
        assertEquals(3, transactions.attempts);
        assertEquals(3, transactions.transactionIdentities.stream().distinct().count());
    }

    @Test
    void preservesDomainErrorsWithoutRetrying() {
        IllegalStateException failure = new IllegalStateException("domain");
        AtomicInteger attempts = new AtomicInteger();

        IllegalStateException actual = assertThrows(IllegalStateException.class, () ->
                SqliteBusyRetry.executeTransaction(new FakeTransactions(0), () -> {
                    attempts.incrementAndGet();
                    throw failure;
                }));

        assertSame(failure, actual);
        assertEquals(1, attempts.get());
    }

    private static final class FakeTransactions implements TransactionOperations {
        private final int failures;
        private final List<Object> transactionIdentities = new ArrayList<>();
        private int attempts;

        private FakeTransactions(int failures) {
            this.failures = failures;
        }

        @Override
        public <T> T execute(TransactionCallback<T> callback) {
            attempts++;
            transactionIdentities.add(new Object());
            if (attempts <= failures) {
                throw new RuntimeException(new SQLException("busy", "", 5));
            }
            return callback.doInTransaction(null);
        }
    }
}
