package de.justvotes.bootstrap;

import de.justvotes.adapters.sqlite.SqliteBusyRetry;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Map;
import java.util.Set;
import javax.sql.DataSource;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/** Prevents the service from becoming ready when the mounted SQLite file drifted from V1. */
@Component
class SqliteSchemaValidator implements ApplicationRunner {
  private static final Map<String, Set<String>> EXPECTED_COLUMNS = Map.of(
      "Poll", Set.of("id", "title", "visibility", "state", "createdBy", "createdAt", "updatedAt", "endsAt"),
      "Option", Set.of("id", "pollID", "text", "number"),
      "Vote", Set.of("id", "pollID", "optionID", "userID", "votedAt"),
      "OptionTemplate", Set.of("id", "name", "createdAt", "updatedAt"),
      "OptionTemplateGroup", Set.of("id", "name", "description", "createdAt", "updatedAt"),
      "OptionTemplateGroupMember", Set.of("id", "templateID", "groupID", "createdAt"),
      "PollDomainEvent", Set.of("id", "pollId", "eventType", "actorId", "metadata", "createdAt"),
      "Admin", Set.of("id", "username", "hashedPassword", "createdAt", "updatedAt"));

  private final DataSource dataSource;

  SqliteSchemaValidator(DataSource dataSource) {
    this.dataSource = dataSource;
  }

  @Override
  public void run(ApplicationArguments arguments) throws SQLException {
    SqliteBusyRetry.execute(() -> {
      try (Connection connection = dataSource.getConnection()) {
        for (var table : EXPECTED_COLUMNS.entrySet()) {
          validateTable(connection, table.getKey(), table.getValue());
        }
      }
      return null;
    });
  }

  private static void validateTable(Connection connection, String table, Set<String> expectedColumns) throws SQLException {
    Set<String> actualColumns = new java.util.HashSet<>();
    try (Statement statement = connection.createStatement();
         ResultSet result = statement.executeQuery("PRAGMA table_info(\"" + table + "\")")) {
      while (result.next()) {
        actualColumns.add(result.getString("name"));
      }
    }
    if (!actualColumns.equals(expectedColumns)) {
      throw new SQLException("Schema deviation in " + table + ": expected " + expectedColumns + " but found " + actualColumns);
    }
  }
}
