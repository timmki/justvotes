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

Zusätzlich müssen bei der Installation genau ein Systemadmin und dessen BCrypt-Hash
konfiguriert werden: `ADMIN_USERNAME` und `ADMIN_PASSWORD_HASH`. Die Anwendung
startet nicht ohne diese Werte.

```powershell
docker build -t justvotes .
docker run --rm -p 8080:8080 -v justvotes-data:/data `
  -e ADMIN_USERNAME=systemadmin `
  -e ADMIN_PASSWORD_HASH='<bcrypt-hash>' justvotes
```

Die Anwendung liefert ihre statischen Dateien unter derselben Origin aus. Betriebsendpunkte:

- `GET /actuator/health`
- `GET /actuator/health/readiness`

SQLite nutzt WAL, einen `busy_timeout` von fünf Sekunden und einen begrenzten
Verbindungspool. Logs werden als JSON auf Standardausgabe ausgegeben. Forwarded
Headers werden durch Spring verarbeitet.

## Systemadmin-Sitzung

`GET /api/v1/csrf` liefert den CSRF-Token und setzt das zugehörige Cookie.
`POST /api/v1/admin/login` erwartet JSON mit `username` und `password`; der Token
muss im Header `X-XSRF-TOKEN` gesendet werden. Erfolgreiche Anmeldungen erhalten
eine serverseitige HTTP-Session. `POST /api/v1/admin/logout` benötigt ebenfalls den
CSRF-Token und beendet die Sitzung. Nicht angemeldete Zugriffe unter `/api/v1/admin`
erhalten `401` als RFC-9457-Problem-Details.
