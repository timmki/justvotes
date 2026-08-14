package de.justvotes.bootstrap;

import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;

import java.nio.file.Path;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SchemaDeviationStartupTest {
    @Test
    void refusesToStartWhenAnExpectedIndexIsMissing() throws SQLException {
        Path database = Path.of("target", "schema-deviation-" + UUID.randomUUID() + ".db");
        String databaseUrl = "jdbc:sqlite:" + database;

        try (ConfigurableApplicationContext ignored = start(databaseUrl)) {
            // The first start creates and validates the expected schema.
        }
        try (var connection = DriverManager.getConnection(databaseUrl);
             var statement = connection.createStatement()) {
            statement.execute("DROP INDEX \"Vote_optionID_idx\"");
        }

        assertThatThrownBy(() -> start(databaseUrl))
                .satisfies(exception -> assertThat(exception.getCause()).hasMessageContaining("Schema deviation"));
    }

    private static ConfigurableApplicationContext start(String databaseUrl) {
        return new SpringApplication(JustVotesApplication.class).run(
                "--spring.main.web-application-type=none",
                "--spring.datasource.url=" + databaseUrl);
    }
}
