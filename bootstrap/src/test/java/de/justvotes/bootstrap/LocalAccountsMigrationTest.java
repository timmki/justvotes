package de.justvotes.bootstrap;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;

import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class LocalAccountsMigrationTest {
    private static final List<String> VOTE_EVENTS = List.of("VoteCast", "VoteReplaced", "VoteWithdrawn",
            "VoteRemovedByAdmin", "VoteRemovedForIdentityChange");

    private static Flyway flyway(String url, String target) {
        return Flyway.configure().dataSource(url, null, null).locations("classpath:db/migration").target(target).load();
    }

    private static int count(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            result.next();
            return result.getInt(1);
        }
    }

    private static List<String> strings(Statement statement, String sql) throws SQLException {
        List<String> values = new ArrayList<>();
        try (ResultSet result = statement.executeQuery(sql)) {
            while (result.next()) {
                values.add(result.getString(1));
            }
        }
        return values;
    }

    @Test
    void deletesAllVotesAndVoteEventsOnceAndKeepsPollsAndCatalog() throws Exception {
        String url = "jdbc:sqlite:" + Path.of("target", "migration-" + UUID.randomUUID() + ".db");
        flyway(url, "6").migrate();
        try (Connection connection = DriverManager.getConnection(url); Statement statement = connection.createStatement()) {
            statement.execute("INSERT INTO \"Poll\" (id, title, visibility, state, \"createdBy\") VALUES ('p1', 'Wahl', 'public', 'active', 'systemadmin')");
            statement.execute("INSERT INTO \"Option\" (id, \"pollID\", text, number) VALUES (1, 'p1', 'Ja', 1)");
            statement.execute("INSERT INTO \"Vote\" (\"pollID\", \"optionID\", \"userID\") VALUES ('p1', 1, 'alice')");
            statement.execute("INSERT INTO \"Vote\" (\"pollID\", \"optionID\", \"userID\") VALUES ('p1', 1, 'bob')");
            statement.execute("INSERT INTO \"OptionTemplate\" (name) VALUES ('Ja')");
            statement.execute("INSERT INTO \"PollDomainEvent\" (\"pollId\", \"eventType\", \"actorId\") VALUES ('p1', 'PollPublished', 'systemadmin')");
            for (String event : VOTE_EVENTS) {
                statement.execute("INSERT INTO \"PollDomainEvent\" (\"pollId\", \"eventType\", \"actorId\") VALUES ('p1', '" + event + "', 'alice')");
            }
            statement.execute("INSERT INTO \"Admin\" (username, \"hashedPassword\") VALUES ('old', 'x')");
        }

        flyway(url, "latest").migrate();

        try (Connection connection = DriverManager.getConnection(url); Statement statement = connection.createStatement()) {
            assertThat(count(statement, "SELECT count(*) FROM \"Vote\"")).isZero();
            assertThat(strings(statement, "SELECT \"eventType\" FROM \"PollDomainEvent\"")).containsExactly("PollPublished");
            assertThat(count(statement, "SELECT count(*) FROM \"Poll\"")).isEqualTo(1);
            assertThat(count(statement, "SELECT count(*) FROM \"Option\"")).isEqualTo(1);
            assertThat(count(statement, "SELECT count(*) FROM \"OptionTemplate\"")).isEqualTo(1);
            List<String> tables = strings(statement, "SELECT name FROM sqlite_master WHERE type = 'table'");
            assertThat(tables).contains("Account", "Invitation").doesNotContain("Admin");
        }
    }
}
