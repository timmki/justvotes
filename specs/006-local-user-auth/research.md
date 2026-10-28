# Research: Lokale Konten mit Anmeldung und Berechtigungen

Alle Punkte des Technical Context sind entschieden; es verbleiben keine
offenen Klärungen.

## R1 – Authentifizierungs-Framework

- **Decision**: Spring Security (bereits vorhanden) mit eigenem
  `UserDetailsService` über den Out-Port `AccountRepository`, serverseitiger
  `HttpSession` (`JSESSIONID`) und `CookieCsrfTokenRepository`. Anmeldung
  weiterhin als JSON-Endpunkt (`POST /session/login`), nicht Form-Login.
- **Rationale**: Läuft vollständig lokal, ist bereits integriert und von der
  Constitution („serverseitige Sitzung mit Cookies und CSRF MUST beibehalten“)
  gefordert. Kein neuer Mechanismus nötig.
- **Alternatives considered**: Keycloak/OIDC (ausgeschlossen durch Anforderung);
  JWT im Client (verstößt gegen Constitution); Spring Authorization Server
  (überdimensioniert für eine Instanz).

## R2 – Passwort-Hashing

- **Decision**: `DelegatingPasswordEncoder` mit Standard
  `pbkdf2@SpringSecurity_v5_8` (PBKDF2-HMAC-SHA256, 310 000 Iterationen) für
  neue Passwörter; `bcrypt` bleibt als lesbares Format für den aus
  `ADMIN_PASSWORD_HASH` übernommenen Hash. Gespeichert wird der Hash mit
  Präfix (`{pbkdf2@...}`, `{bcrypt}`); beim nächsten erfolgreichen Login wird
  ein BCrypt-Hash auf PBKDF2 aktualisiert (`upgradeEncoding`).
- **Rationale**: FR-015 verlangt mindestens 64 Zeichen; BCrypt verarbeitet nur
  72 Bytes und Spring Security 6.4 lehnt längere Eingaben ab – 64 Zeichen in
  UTF-8 können bis zu 256 Bytes sein. PBKDF2 ist in `spring-security-crypto`
  enthalten, also keine neue Abhängigkeit.
- **Alternatives considered**: Argon2 (benötigt BouncyCastle, neue
  Abhängigkeit); BCrypt mit Byte-Limit (widerspricht FR-015 bei Umlauten);
  BCrypt mit SHA-256-Prehash (nicht standardisiert in Spring).

## R3 – Passwortregeln

- **Decision**: 12 bis 128 Unicode-Codepoints, keine reinen Leerzeichen,
  keine weiteren Kompositionsregeln; Prüfung im Domänen-Value-Object
  `Password`. Das neue Passwort darf nicht dem bisherigen entsprechen.
- **Rationale**: Entspricht NIST SP 800-63B (Länge vor Komplexität) und FR-015.
- **Alternatives considered**: Zeichenklassenregeln (schlechtere UX, kein
  Sicherheitsgewinn); Blocklisten-Prüfung (externer Dienst oder große Liste –
  nicht Teil der ersten Version).

## R4 – Sitzungsablauf und Beenden anderer Sitzungen

- **Decision**: `server.servlet.session.timeout=30m` für Inaktivität; ein
  `SessionValidationFilter` prüft pro Anfrage (a) absolute Dauer ≤ 12 h anhand
  des beim Login in der Sitzung abgelegten Zeitpunkts und (b) die in der
  Sitzung gespeicherte `sessionEpoch` gegen den aktuellen Wert am Konto sowie
  den Kontostatus. Passwortänderung, Einmalpasswort und Sperrung erhöhen die
  Epoche am Konto; die eigene Sitzung wird beim Passwortwechsel mit neuer
  Epoche fortgeschrieben, andere Sitzungen werden dadurch ungültig.
- **Rationale**: Funktioniert ohne Sitzungsregister, übersteht Neustarts und
  deckt FR-008, FR-016 und FR-031 mit einem einzigen Mechanismus ab. Eine
  Primärschlüssel-Abfrage pro Anfrage ist bei der Größenordnung unkritisch.
- **Alternatives considered**: `SessionRegistry` + `expireNow()` (nur
  in-memory, unvollständig nach Neustart, zusätzliche Konfiguration);
  Spring Session JDBC (neue Abhängigkeit).

## R5 – Anmeldedrosselung

- **Decision**: In-Memory-Drosselung pro normalisiertem Kontonamen
  (unabhängig davon, ob das Konto existiert): ab 5 aufeinanderfolgenden
  Fehlversuchen exponentielle Sperrfrist ab 30 s, verdoppelt bis maximal 15 min;
  Erfolg setzt zurück. Gedrosselte Anfragen erhalten `429` mit `Retry-After`
  und der Problem-Code `login-throttled`. Bei unbekanntem Konto wird trotzdem
  ein Dummy-Hash geprüft (Timing-Angleichung).
- **Rationale**: FR-006/FR-007 ohne Kontosperre (Edge Case „ohne das Konto
  dauerhaft zu sperren“); Einzelinstanz erlaubt In-Memory.
- **Alternatives considered**: Persistente Zähler in der DB (mehr Schreiblast,
  nicht nötig für eine Instanz); Bucket4j (neue Abhängigkeit).

## R6 – Einladungs-Token und Link

- **Decision**: 32 Byte aus `SecureRandom`, Base64url-kodiert; gespeichert wird
  nur der SHA-256-Hash. Der Link lautet
  `${PUBLIC_BASE_URL}/invitation#token=<token>` – das Token steht im Fragment
  und erreicht damit weder Server-Logs noch Referrer. Die SPA sendet es per
  `POST` an `/invitations/inspection` bzw. `/invitations/acceptance`.
  Gültigkeit 7 Tage; erneuter Versand erzeugt ein neues Token und macht das
  alte ungültig.
- **Rationale**: Erfüllt FR-019 und schützt das Token vor Logging.
- **Alternatives considered**: Token im Pfad (landet in Access-Logs);
  signierte, zustandslose Token (Widerruf/Einmaligkeit schwer umzusetzen).

## R7 – Mailversand

- **Decision**: `spring-boot-starter-mail` (`JavaMailSender`) hinter dem
  Out-Port `InvitationMailer`. Konfiguration über `MAIL_HOST`, `MAIL_PORT`,
  `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM`, `MAIL_STARTTLS`
  (Standard `true`) und `PUBLIC_BASE_URL`. Der Versand erfolgt nach dem Commit
  der Einladung; ein Fehler setzt `deliveryFailed` an der Einladung und wird
  dem Administrator angezeigt. Ist `MAIL_HOST` oder `PUBLIC_BASE_URL` nicht
  gesetzt, startet die Anwendung trotzdem, das Anlegen von Einladungen wird
  aber mit `409 invitation-delivery-unavailable` abgelehnt. Mail-Text
  zweisprachig (de/en) als einfacher Text.
  `spring.mail.host` wird nicht mit leerem Standardwert (`${MAIL_HOST:}`)
  belegt, weil Spring Boot einen leeren Wert als gesetzt wertet und dann
  `JavaMailSender` samt Mail-Health-Indikator aktiviert. Stattdessen:
  `management.health.mail.enabled: false` und `SmtpInvitationMailer` wird nur
  registriert, wenn `MAIL_HOST` nicht leer ist (`@ConditionalOnExpression`
  bzw. Prüfung in `AccountManagementConfiguration`); sonst wird ein
  `UnavailableInvitationMailer` verdrahtet, der die Verfügbarkeitsprüfung
  negativ beantwortet. `/actuator/health` bleibt damit ohne Mailserver `UP`.
- **Rationale**: Einzige zusätzliche Abhängigkeit, Standard in Spring Boot.
  Tests nutzen eine In-Memory-Implementierung des Ports, daher keine neue
  Testabhängigkeit. Ein ausgefallener Mailserver darf Betrieb und
  Bereitschaft nicht beeinträchtigen; Versandprobleme werden am
  Einladungsstatus sichtbar.
- **Alternatives considered**: GreenMail für Integrationstests (neue
  Testabhängigkeit, verzichtbar); HTML-Mails (mehr Aufwand ohne Mehrwert).

## R8 – Initiales Administratorkonto

- **Decision**: Beim Start legt `AccountManagementConfiguration` das
  Administratorkonto aus `ADMIN_USERNAME`/`ADMIN_PASSWORD_HASH` an, falls noch
  keins existiert. Ein bestehendes Administratorkonto wird nicht überschrieben,
  damit ein in der Anwendung geänderter Passwort-Hash erhalten bleibt. Mit
  `ADMIN_PASSWORD_RESET=true` wird der Hash aus der Umgebung einmalig erneut
  übernommen (Notfallwiederherstellung). Das Administratorkonto hat weder
  Identität noch E-Mail-Adresse.
- **Rationale**: Erfüllt FR-028 und ermöglicht FR-016 auch für den
  Administrator; einzig mögliche Wiederherstellung ohne zweiten Administrator.
- **Alternatives considered**: Hash bei jedem Start überschreiben (macht
  Passwortänderung in der Anwendung wirkungslos); Administrator nur über
  Umgebung (widerspricht FR-016).

## R9 – Autorisierungsmatrix

- **Decision**: `SecurityFilterChain`:
  - `permitAll`: `/api/v1/csrf`, `POST /api/v1/session/login`,
    `POST /api/v1/invitations/**`, Actuator-Health, `/config.js`, statische
    SPA-Assets und SPA-Fallback (die SPA zeigt ohne Sitzung nur Anmeldung bzw.
    Einladung). Diese technischen Ressourcen enthalten keine fachlichen Daten.
  - `authenticated`: `GET /api/v1/session`, `POST /api/v1/session/logout`,
    `PUT /api/v1/session/password`.
  - `hasRole('USER')`: `/api/v1/polls/**`, `/api/v1/identity/**`.
  - `hasRole('ADMIN')`: `/api/v1/admin/**` sowie API-Doku und Swagger UI
    (`/api-docs/**`, `/swagger-ui/**`), sofern `API_DOCS_ENABLED=true`. Damit
    gilt FR-002 auch für die Doku; Swagger UI funktioniert nach Anmeldung in
    der SPA mit demselben Sitzungs-Cookie.
  - alles andere unter `/api/v1/**`: `denyAll`.
  Ein Konto mit `passwordChangeRequired` erhält außer auf `session`-Endpunkten
  `403 password-change-required`.
- **Rationale**: Deckt FR-002, FR-017, FR-025, FR-026 und FR-027 deklarativ
  ab; Default-deny verhindert vergessene Endpunkte.
- **Alternatives considered**: Methodensicherheit mit `@PreAuthorize`
  (verteilt Regeln über generierte Interfaces, schwerer prüfbar).

## R10 – Identität im Abstimmungsfluss

- **Decision**: `PublicPollController` und `IdentityController` lesen die
  Identität aus dem Request-Attribut `AuthenticatedAccount` (`accountId`,
  `accountName`, `role`, `identity`), das der `SessionValidationFilter` aus der
  geprüften Sitzung setzt, nicht mehr aus dem `userID`-Cookie. So bleibt
  `adapters` frei von Spring Security (siehe plan.md, Adapter-/Security-Grenze).
  `ManageVotes.changeIdentity`, `IdentityCookieCodec`, `POST /identity`,
  `GET /identity` und das Ereignis `VoteRemovedForIdentityChange` entfallen.
  Beim Login wird ein vorhandenes `userID`-Cookie mit `Max-Age=0` gelöscht.
- **Rationale**: FR-011; Domäne `poll-management` bleibt unabhängig von Konten.
- **Alternatives considered**: Identität weiterhin als Cookie setzen
  (zweite Wahrheitsquelle, manipulierbar).

## R11 – Einmalige Datenbereinigung

- **Decision**: `V7__local_accounts.sql` löscht alle Zeilen aus `"Vote"` und
  alle `"PollDomainEvent"` mit `eventType` in (`VoteCast`, `VoteReplaced`,
  `VoteWithdrawn`, `VoteRemovedByAdmin`, `VoteRemovedForIdentityChange`),
  entfernt die ungenutzte Tabelle `"Admin"` und legt `"Account"` und
  `"Invitation"` an. Polls, Optionen, Snapshots und Katalog bleiben.
- **Rationale**: FR-013; Flyway ist die einzige erlaubte Schemaänderung.
- **Alternatives considered**: Bereinigung beim Start in Java (nicht
  versioniert, wiederholbar ausgeführt).

## R12 – Sicherheitsereignisse

- **Decision**: Strukturierte JSON-Logeinträge (vorhandenes
  `logstash-logback-encoder`) mit Logger `justvotes.security`, Feldern
  `event`, `accountId`, `accountName` und Zeitpunkt. Bei `login-failed` und
  `login-throttled` für einen nicht existierenden Kontonamen wird der
  eingegebene Name nicht geloggt, sondern nur `nameFingerprint` = die ersten
  12 Hex-Zeichen von SHA-256 über den normalisierten Namen – ein versehentlich
  ins Namensfeld getipptes Passwort gelangt so nicht ins Log, wiederholte
  Versuche bleiben korrelierbar. Bei existierenden Konten werden `accountId`
  und `accountName` geloggt. Nie Passwörter oder
  Tokens. Keine eigene Tabelle und keine Oberfläche in dieser Version.
  Umsetzung als `SecurityEventLogger` in `adapters/shared/infra/in/http`
  (nur SLF4J), damit sowohl die Admin-Controller in `adapters` als auch
  `SessionController`/`InvitationAcceptanceController` in `bootstrap` ihn
  nutzen können. Ereignisse: `login`, `login-failed`, `login-throttled`,
  `logout`, `password-changed`, `invitation-issued`, `invitation-resent`,
  `invitation-revoked`, `invitation-accepted`, `account-locked`,
  `account-unlocked`, `one-time-password-set`, `admin-password-reset`.
- **Rationale**: FR-032 verlangt Nachvollziehbarkeit, keine Ansicht; Logs
  sind bereits zentralisiert.
- **Alternatives considered**: Datenbanktabelle mit Admin-Ansicht (nicht
  gefordert, zusätzlicher Umfang).

## R13 – Frontend-Anmeldeschranke

- **Decision**: `GET /session` als React-Query-Abfrage (`sessionQuery`) in
  `features/auth`. `App` rendert ohne Sitzung nur die Routen `/login` und
  `/invitation`; alle anderen Pfade leiten auf `/login` und merken das Ziel im
  vorhandenen `SessionCoordinator`. Mit Sitzung: Rolle `USER` → Polls,
  Profil, Passwort; Rolle `ADMIN` → `/admin/*` und Passwort; Startseite leitet
  rollenabhängig weiter. `passwordChangeRequired` erzwingt `/password`.
  Ein `401` irgendeiner Abfrage invalidiert `sessionQuery` und löscht
  geschützte Abfragen (`clearProtectedQueries`).
  Die Route `/invitation` ist für beide Zustände registriert und wird nie
  rollenabhängig umgeleitet: Ohne Sitzung zeigt sie das Formular zum
  Vervollständigen; mit Sitzung zeigt sie den Hinweis „Du bist als
  `Kontoname` angemeldet – zum Annehmen der Einladung bitte abmelden“ mit
  Abmelde-Schaltfläche. Das Token aus dem Fragment wird beim ersten Rendern in
  `sessionStorage` übernommen und aus der URL entfernt, damit es die Abmeldung
  übersteht; nach der Abmeldung lädt die Seite die Prüfung
  (`/invitations/inspection`) mit diesem Token, nach Annahme oder Ablehnung
  wird es gelöscht. Damit erfüllt das Frontend den Edge Case „Einladungslink
  bei bestehender Anmeldung“ verständlich, ohne dass der Server ein Token im
  angemeldeten Zustand prüft; `409 already-authenticated` bleibt als
  serverseitige Absicherung.
- **Rationale**: Nutzt vorhandene Bausteine (`SessionCoordinator`,
  `queryClient`); Serverzustand bleibt in React Query (Constitution IV).
- **Alternatives considered**: Separate Login-HTML-Seite außerhalb der SPA
  (bricht i18n/Theming).
