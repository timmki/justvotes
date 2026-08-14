package de.justvotes.bootstrap;

import de.justvotes.adapters.sqlite.SqliteBusyRetry;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.sql.DataSource;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/** Prevents the service from becoming ready when the mounted SQLite file drifted from V1. */
@Component
class SqliteSchemaValidator implements ApplicationRunner {
  private static final Pattern CREATE_OBJECT = Pattern.compile("CREATE (?:TABLE|INDEX) \\\"([^\\\"]+)\\\"");
  private final DataSource dataSource;

  SqliteSchemaValidator(DataSource dataSource) {
    this.dataSource = dataSource;
  }

  @Override
  public void run(ApplicationArguments arguments) throws SQLException {
    Map<String, String> expectedSchema = expectedSchema();
    SqliteBusyRetry.execute(() -> {
      try (Connection connection = dataSource.getConnection()) {
        Map<String, String> actualSchema = actualSchema(connection);
        if (!actualSchema.equals(expectedSchema)) {
          throw new SQLException("Schema deviation: expected " + expectedSchema.keySet()
              + " but found " + actualSchema.keySet());
        }
      }
      return null;
    });
  }

  private static Map<String, String> expectedSchema() throws SQLException {
    try (InputStream migration = SqliteSchemaValidator.class.getResourceAsStream("/db/migration/V1__initial_schema.sql")) {
      if (migration == null) {
        throw new SQLException("Initial schema migration is unavailable");
      }
      Map<String, String> schema = new LinkedHashMap<>();
      for (String statement : new String(migration.readAllBytes(), StandardCharsets.UTF_8).split(";")) {
        Matcher object = CREATE_OBJECT.matcher(statement);
        if (object.find()) {
          schema.put(object.group(1), normalize(statement));
        }
      }
      return schema;
    } catch (IOException exception) {
      throw new SQLException("Could not read the initial schema migration", exception);
    }
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
}
