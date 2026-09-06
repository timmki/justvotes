package de.justvotes.bootstrap;

import de.justvotes.adapters.sqlite.SqliteRetryingTransaction;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.datasource.DataSourceUtils;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.support.JdbcUtils;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;

class SqliteRetryIntegrationTest {
    @Test
    void retriesAWriteAfterAnExclusiveSqliteLockIsReleased() throws Exception {
        Path database = Files.createTempFile("justvotes-retry-", ".db");
        DriverManagerDataSource dataSource = new DriverManagerDataSource("jdbc:sqlite:" + database);
        try (Connection setup = dataSource.getConnection();
             Connection lock = dataSource.getConnection()) {
            setup.createStatement().executeUpdate("create table values_table (value integer)");
            lock.createStatement().execute("begin exclusive");

            AtomicInteger attempts = new AtomicInteger();
            Thread releaser = Thread.startVirtualThread(() -> {
                try {
                    Thread.sleep(100);
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                }
                JdbcUtils.closeConnection(lock);
            });
            new SqliteRetryingTransaction(new DataSourceTransactionManager(dataSource)).execute(() -> {
                attempts.incrementAndGet();
                Connection connection = DataSourceUtils.getConnection(dataSource);
                try (var statement = connection.createStatement()) {
                    statement.execute("pragma busy_timeout = 0");
                    statement.executeUpdate("insert into values_table values (1)");
                } catch (SQLException exception) {
                    throw new RuntimeException(exception);
                }
                return null;
            });
            releaser.join();

            assertEquals(2, attempts.get());
            try (var statement = setup.createStatement(); var rows = statement.executeQuery("select count(*) from values_table")) {
                rows.next();
                assertEquals(1, rows.getInt(1));
            }
        } finally {
            Files.deleteIfExists(database);
        }
    }
}
