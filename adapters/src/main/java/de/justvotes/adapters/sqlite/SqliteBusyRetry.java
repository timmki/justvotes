package de.justvotes.adapters.sqlite;

import java.sql.SQLException;

/** Retries transient SQLite lock conflicts a bounded number of times. */
public final class SqliteBusyRetry {
  private static final int MAX_ATTEMPTS = 3;
  private static final long BACKOFF_MILLIS = 100;

  private SqliteBusyRetry() {}

  public static <T> T execute(SqlWork<T> work) throws SQLException {
    SQLException failure = null;
    for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return work.execute();
      } catch (SQLException exception) {
        failure = exception;
        if (!isBusy(exception) || attempt == MAX_ATTEMPTS) {
          throw exception;
        }
        pause();
      }
    }
    throw failure;
  }

  private static boolean isBusy(SQLException exception) {
    return exception.getMessage() != null
        && (exception.getMessage().contains("SQLITE_BUSY") || exception.getMessage().contains("database is locked"));
  }

  private static void pause() throws SQLException {
    try {
      Thread.sleep(BACKOFF_MILLIS);
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      throw new SQLException("Interrupted while retrying a SQLite lock conflict", exception);
    }
  }

  @FunctionalInterface
  public interface SqlWork<T> {
    T execute() throws SQLException;
  }
}
