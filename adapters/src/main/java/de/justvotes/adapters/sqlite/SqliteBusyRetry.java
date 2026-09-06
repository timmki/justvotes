package de.justvotes.adapters.sqlite;

import java.sql.SQLException;
import java.util.Locale;
import java.util.function.LongConsumer;
import java.util.function.Supplier;
import org.springframework.transaction.support.TransactionOperations;

/**
 * Retries transient SQLite lock conflicts a bounded number of times.
 */
public final class SqliteBusyRetry {
    private static final int MAX_ATTEMPTS = 5;
    private static final long INITIAL_BACKOFF_MILLIS = 500L;

    private SqliteBusyRetry() {
    }

    public static <T> T execute(SqlWork<T> work) throws SQLException {
        return execute(work, SqliteBusyRetry::pause);
    }

    static <T> T execute(SqlWork<T> work, SqlSleeper sleeper) throws SQLException {
        SQLException failure = null;
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                return work.execute();
            } catch (SQLException exception) {
                failure = exception;
                if (!isLock(exception) || attempt == MAX_ATTEMPTS) {
                    throw exception;
                }
                sleeper.sleep(backoffMillis(attempt));
            }
        }
        throw failure;
    }

    public static <T> T executeTransaction(TransactionOperations transactions, Supplier<T> work) {
        return executeTransaction(transactions, work, SqliteBusyRetry::pauseUnchecked);
    }

    public static <T> T executeTransaction(TransactionOperations transactions, Supplier<T> work, LongConsumer sleeper) {
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                return transactions.execute(status -> work.get());
            } catch (RuntimeException exception) {
                if (!isLock(exception) || attempt == MAX_ATTEMPTS) {
                    throw exception;
                }
                sleeper.accept(backoffMillis(attempt));
            }
        }
        throw new IllegalStateException("SQLite transaction retry exhausted");
    }

    private static boolean isLock(Throwable exception) {
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (cause instanceof SQLException sqlException) {
                int primaryErrorCode = sqlException.getErrorCode() & 0xff;
                if (primaryErrorCode == 5 || primaryErrorCode == 6) {
                    return true;
                }
            }
            String message = cause.getMessage();
            if (message != null) {
                String normalized = message.toLowerCase(Locale.ROOT);
                if (normalized.contains("sqlite_busy") || normalized.contains("sqlite_locked")
                        || normalized.contains("database is locked")
                        || normalized.contains("database table is locked")
                        || normalized.contains("database schema is locked")) {
                    return true;
                }
            }
        }
        return false;
    }

    private static long backoffMillis(int attempt) {
        return INITIAL_BACKOFF_MILLIS << (attempt - 1);
    }

    private static void pause(long millis) throws SQLException {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new SQLException("Interrupted while retrying a SQLite lock conflict", exception);
        }
    }

    private static void pauseUnchecked(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while retrying a SQLite lock conflict", exception);
        }
    }

    @FunctionalInterface
    public interface SqlWork<T> {
        T execute() throws SQLException;
    }

    @FunctionalInterface
    interface SqlSleeper {
        void sleep(long millis) throws SQLException;
    }
}
