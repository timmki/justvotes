package de.justvotes.bootstrap;

import de.justvotes.adapters.sqlite.SqliteBusyRetry;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Prevents the service from becoming ready when the mounted SQLite file drifted from V1.
 */
@Component
class SqliteSchemaValidator implements ApplicationRunner {
    private static final Pattern CREATE_OBJECT = Pattern.compile("CREATE (?:TABLE|INDEX) \\\"([^\\\"]+)\\\"");
    private static final Pattern ADD_COLUMN = Pattern.compile("ALTER TABLE\\s+\\\"([^\\\"]+)\\\"\\s+ADD COLUMN\\s+(.+)", Pattern.DOTALL);
    private static final List<String> MIGRATIONS = List.of(
            "/db/migration/V1__initial_schema.sql",
            "/db/migration/V2__enforce_global_catalog_name_rules.sql",
            "/db/migration/V3__store_poll_template_group_snapshots.sql",
            "/db/migration/V4__store_poll_template_option_snapshots.sql");
    private final DataSource dataSource;

    SqliteSchemaValidator(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    private static Map<String, String> expectedSchema() throws SQLException {
        try {
            Map<String, String> schema = new LinkedHashMap<>();
            for (String migrationPath : MIGRATIONS) {
                try (InputStream migration = SqliteSchemaValidator.class.getResourceAsStream(migrationPath)) {
                    if (migration == null) throw new SQLException("Schema migration is unavailable: " + migrationPath);
                    for (String statement : new String(migration.readAllBytes(), StandardCharsets.UTF_8).split(";")) {
                        Matcher object = CREATE_OBJECT.matcher(statement);
                        Matcher column = ADD_COLUMN.matcher(statement.trim());
                        if (object.find()) schema.put(object.group(1), normalize(statement));
                        if (column.matches()) addColumn(schema, column.group(1), column.group(2));
                    }
                }
            }
            return schema;
        } catch (IOException exception) {
            throw new SQLException("Could not read the initial schema migration", exception);
        }
    }

    private static void addColumn(Map<String, String> schema, String table, String column) {
        String createTable = schema.get(table);
        schema.put(table, normalize(createTable.substring(0, createTable.lastIndexOf(')')) + ", " + column + ')'));
    }

    private static Map<String, String> actualSchema(Connection connection) throws SQLException {
        Map<String, String> schema = new LinkedHashMap<>();
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("""
                     SELECT name, sql FROM sqlite_master
                     WHERE type IN ('table', 'index')
                       AND name NOT LIKE 'sqlite_%'
                       AND name NOT LIKE 'flyway_schema_history%'
                     ORDER BY name
                     """)) {
            while (result.next()) {
                schema.put(result.getString("name"), normalize(result.getString("sql")));
            }
        }
        return schema;
    }

    private static String normalize(String sql) {
        return sql.replaceAll("\\s+", " ").trim().toLowerCase(Locale.ROOT);
    }

    @Override
    public void run(ApplicationArguments arguments) throws SQLException {
        Map<String, String> expectedSchema = expectedSchema();
        SqliteBusyRetry.execute(() -> {
            try (Connection connection = dataSource.getConnection()) {
                Map<String, String> actualSchema = actualSchema(connection);
                if (!actualSchema.equals(expectedSchema)) {
                    throw new SQLException("Schema deviation: expected " + expectedSchema
                            + " but found " + actualSchema);
                }
            }
            return null;
        });
    }
}
