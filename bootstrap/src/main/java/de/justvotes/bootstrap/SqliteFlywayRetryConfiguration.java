package de.justvotes.bootstrap;

import org.flywaydb.core.api.FlywayException;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Retries a transient SQLite lock while Flyway initializes the mounted database.
 */
@Configuration
class SqliteFlywayRetryConfiguration {
    private static final int MAX_ATTEMPTS = 3;
    private static final long BACKOFF_MILLIS = 100;

    @Bean
    FlywayMigrationStrategy sqliteMigrationRetry() {
        return flyway -> {
            for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
                try {
                    flyway.migrate();
                    return;
                } catch (FlywayException exception) {
                    if (!isBusy(exception) || attempt == MAX_ATTEMPTS) {
                        throw exception;
                    }
                    pause();
                }
            }
        };
    }

    private static boolean isBusy(Throwable exception) {
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            String message = cause.getMessage();
            if (message != null && (message.contains("SQLITE_BUSY") || message.contains("database is locked"))) {
                return true;
            }
        }
        return false;
    }

    private static void pause() {
        try {
            Thread.sleep(BACKOFF_MILLIS);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while retrying Flyway migration", exception);
        }
    }
}
