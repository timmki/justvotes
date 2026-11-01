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

class MemberTemplateGroupMigrationTest {
    private static final String ACCOUNT = "INSERT INTO \"Account\" (role, identity, \"identityKey\", email, \"emailKey\", status, \"passwordHash\", \"createdAt\", \"updatedAt\") VALUES ";

    private static Flyway flyway(String url, String target) {
        return Flyway.configure().dataSource(url, null, null).locations("classpath:db/migration").target(target).load();
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
    void createsTheMembersGroupFromExistingUserAccounts() throws Exception {
        String url = "jdbc:sqlite:" + Path.of("target", "migration-" + UUID.randomUUID() + ".db");
        flyway(url, "8").migrate();
        try (Connection connection = DriverManager.getConnection(url); Statement statement = connection.createStatement()) {
            statement.execute(ACCOUNT + "('USER', 'Anna', 'anna', 'anna@example.test', 'anna@example.test', 'ACTIVE', 'x', 'now', 'now')");
            statement.execute(ACCOUNT + "('USER', 'Bert', 'bert', 'bert@example.test', 'bert@example.test', 'LOCKED', 'x', 'now', 'now')");
            statement.execute(ACCOUNT + "('ADMIN', NULL, NULL, 'admin@example.test', 'admin@example.test', 'ACTIVE', 'x', 'now', 'now')");
            statement.execute("INSERT INTO \"OptionTemplate\" (id, name) VALUES (7, 'anna')");
            statement.execute("INSERT INTO \"OptionTemplateGroup\" (name, description) VALUES ('Alle Mitglieder', '')");
            statement.execute("INSERT INTO \"Poll\" (id, title, \"createdBy\") VALUES ('p1', 'Alt', 'systemadmin')");
        }

        flyway(url, "latest").migrate();

        try (Connection connection = DriverManager.getConnection(url); Statement statement = connection.createStatement()) {
            assertThat(strings(statement, "SELECT name FROM \"OptionTemplateGroup\" WHERE kind = 'MEMBERS'")).containsExactly("Alle Mitglieder");
            assertThat(strings(statement, "SELECT name FROM \"OptionTemplateGroup\" WHERE kind = 'MANUAL'")).containsExactly("Alle Mitglieder (manuell)");
            assertThat(strings(statement, """
                    SELECT template.name FROM "OptionTemplate" template
                    JOIN "OptionTemplateGroupMember" member ON member."templateID" = template.id
                    JOIN "OptionTemplateGroup" g ON g.id = member."groupID" AND g.kind = 'MEMBERS'
                    ORDER BY template.name
                    """)).containsExactly("Bert", "anna");
            assertThat(strings(statement, "SELECT \"memberIdentityKey\" FROM \"OptionTemplate\" WHERE id = 7")).containsExactly("anna");
            assertThat(strings(statement, "SELECT \"followsMembers\" FROM \"Poll\"")).containsExactly("0");
        }
    }

    @Test
    void createsAnEmptyMembersGroupInAFreshInstance() throws Exception {
        String url = "jdbc:sqlite:" + Path.of("target", "migration-" + UUID.randomUUID() + ".db");
        flyway(url, "latest").migrate();
        try (Connection connection = DriverManager.getConnection(url); Statement statement = connection.createStatement()) {
            assertThat(strings(statement, "SELECT name FROM \"OptionTemplateGroup\" WHERE kind = 'MEMBERS'")).containsExactly("Alle Mitglieder");
            assertThat(strings(statement, "SELECT count(*) FROM \"OptionTemplateGroupMember\"")).containsExactly("0");
        }
    }
}
