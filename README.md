# JustVotes

JustVotes verwaltet öffentliche und private Abstimmungen.

## Starten

Die Anwendung benötigt Java 21. Maven muss in dieser Umgebung mit dem eingecheckten
Settings-File ausgeführt werden:

```powershell
mvn -s .mvn/settings.xml test
```

Der Standarddatenbankpfad ist `/data/justvotes.db`. Er lässt sich mit
`DATABASE_URL` überschreiben. Beim Start validiert und führt Flyway die Migrationen
unter `bootstrap/src/main/resources/db/migration` aus; bei einer abweichenden
Migrationshistorie wird der Start abgebrochen.

```powershell
docker build -t justvotes .
docker run --rm -p 8080:8080 -v justvotes-data:/data justvotes
```

Die Anwendung liefert ihre statischen Dateien unter derselben Origin aus. Betriebsendpunkte:

- `GET /actuator/health`
- `GET /actuator/health/readiness`

SQLite nutzt WAL, einen `busy_timeout` von fünf Sekunden und einen begrenzten
Verbindungspool. Logs werden als JSON auf Standardausgabe ausgegeben. Forwarded
Headers werden durch Spring verarbeitet.
