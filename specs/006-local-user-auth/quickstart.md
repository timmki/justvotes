# Quickstart: Validierung lokale Konten

Validiert die Funktion Ende-zu-Ende. Details zu Endpunkten:
[contracts/openapi-delta.md](contracts/openapi-delta.md); Regeln und
Zustände: [data-model.md](data-model.md).

## Voraussetzungen

- Java 21, Maven mit `.mvn/settings.xml`, Node + pnpm (siehe [README](../../README.md))
- Lokaler SMTP-Testserver mit Weboberfläche, z. B. Mailpit
  (`docker run --rm -p 1025:1025 -p 8025:8025 axllent/mailpit`)
- Optional: Datenbankkopie einer Bestandsinstanz mit Stimmen (für Szenario 7)

## Start

```powershell
$env:ADMIN_EMAIL = "admin@example.test"
$env:ADMIN_PASSWORD_HASH = '$2a$10$yXyXCUgriz0cm1V1n0fypOPqDx.vQRVFpB42WFqYRQgPWd/vDC40m'
$env:DATABASE_URL = "jdbc:sqlite:./data/justvotes-auth.db"
$env:MAIL_HOST = "localhost"; $env:MAIL_PORT = "1025"; $env:MAIL_STARTTLS = "false"
$env:MAIL_FROM = "justvotes@localhost"
$env:PUBLIC_BASE_URL = "http://localhost:5173"
mvn -s .mvn/settings.xml -pl bootstrap -am spring-boot:run
```

```bash
cd frontend && pnpm dev
```

## Automatisierte Prüfungen

```powershell
mvn -s .mvn/settings.xml test
```

```bash
cd frontend && pnpm build && pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e
```

Erwartet: alle grün. Neue Testabdeckung mindestens:

- Unit: `Account`, `Invitation`, `Password`, `EmailAddress`, Drosselung
- HTTP: Zugriffsmatrix (anonym / user / admin / passwordChangeRequired) für
  jede Operation des Vertrags, Login-Drosselung `429`, Sitzungsablauf und
  Epochenprüfung
- Persistenz: `V7`-Migration auf Bestandsschema mit Stimmen
- Frontend/E2E: Anmeldeschranke, Einladungsannahme, Passwortwechsel,
  Admin-Navigation nur für Admin, axe ohne Verstöße auf neuen Seiten

## Manuelle Szenarien

| # | Schritte | Erwartung | Spec |
|---|---|---|---|
| 1 | Ohne Anmeldung `http://localhost:5173/polls` und einen Poll-Direktlink öffnen; `GET /api/v1/polls` per curl | Nur Anmeldeseite; API `401` ohne Poll-Daten | FR-002, SC-001 |
| 2 | Als `admin@example.test` anmelden | Administrationsmenü sichtbar, keine Abstimmungsnavigation; `/polls` und `/profile` verweigert | US3, FR-026, FR-027 |
| 3 | Admin lädt `anna@example.test` ein; Mail in Mailpit öffnen, Link in privatem Fenster aufrufen | Seite „Konto vervollständigen“ mit E-Mail (nicht änderbar); nach Eingabe von Anzeigename und Passwort angemeldet als User, künftige Anmeldung mit `anna@example.test` | US2, SC-006 |
| 4 | Denselben Link erneut öffnen; zweite Einladung mit gleicher Adresse anlegen | `invitation-not-usable`; `email-already-invited` | FR-019, FR-021 |
| 4a | Als Admin angemeldet einen neuen, gültigen Einladungslink öffnen, abmelden | Erst Hinweis „angemeldet als admin@example.test – bitte abmelden“ mit Abmelde-Schaltfläche; nach Abmeldung erscheint das Formular für dieselbe Einladung | Edge Case Einladung, research R13 |
| 5 | Als Anna in aktivem Poll abstimmen; Prüfprotokoll öffnen | Stimme unter Annas Identität | US1, SC-003 |
| 6 | Anna meldet sich in zwei Browsern an, ändert in einem das Passwort | Anderer Browser landet bei nächster Aktion auf der Anmeldung; altes Passwort ungültig | FR-016, SC-005 |
| 7 | Bestandsdatenbank mit Stimmen starten | Nach Start keine Stimmen und keine Stimm-Ereignisse; Polls/Katalog vorhanden | FR-013 |
| 8 | 6× falsches Passwort für `anna@example.test` | Ab Versuch 6 `429` mit `Retry-After`; gleiche Antwort für unbekannten Namen | FR-006, FR-007 |
| 9 | Admin sperrt Anna, während sie angemeldet ist | Annas nächste Aktion → Anmeldung; Login abgelehnt (gleiche Meldung) | FR-031 |
| 10 | Admin entsperrt Anna, setzt Einmalpasswort | Anmeldung damit erzwingt Passwortwechsel, vorher alle anderen Seiten `403 password-change-required` | FR-017, US5 |
| 11 | Admin versucht, sich selbst zu sperren (API) | `409 account-not-manageable` | FR-030 |
| 12 | `MAIL_HOST` entfernen, neu starten, `GET /actuator/health` aufrufen, Einladung anlegen | Health `UP`; Einladung `409 invitation-delivery-unavailable`; App ansonsten nutzbar | research R7 |
| 12a | Mit `API_DOCS_ENABLED=true` `/swagger-ui/index.html` ohne Anmeldung, als User und als Admin öffnen | ohne Anmeldung `401`, User `403`, Admin sieht die Doku | FR-002, research R9 |
| 13 | Logausgabe prüfen, dabei einmal ein Passwort als E-Mail-Adresse eingeben | Sicherheitsereignisse als JSON unter `justvotes.security`, ohne Passwort/Token; für die Eingabe nur `emailFingerprint`, nie eine E-Mail-Adresse | FR-032, SC-008, research R12 |
| 14 | Neue Seiten auf 360 px Breite, nur Tastatur, Sprache umschalten | bedienbar, sichtbarer Fokus, übersetzte Texte | FR-034 |
