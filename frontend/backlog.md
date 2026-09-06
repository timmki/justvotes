# Frontend-Migration: Backend-Gaps und Ausführungsbacklog

Dieses Dokument ist eine eigenständige Übergabe für das neue `justvotes`-Monorepo. Es enthält die benötigten Verhaltensinformationen des Legacy-Frontends direkt und setzt weder Zugriff auf dessen Repository noch Kenntnis seiner Next.js-, Prisma- oder TypeScript-Implementierung voraus. Die Einträge sind so geschnitten, dass ein KI-Agent daraus Backend-Tickets erstellen und anschließend die neue SPA implementieren kann.

Die neue SPA wird ausschließlich im `justvotes`-Monorepo implementiert. Es entsteht kein Parallelbetrieb mit dem Legacy-Frontend und keine Laufzeit- oder Buildabhängigkeit zu dessen Quellcode.

## Abgleichbasis

- Legacy-Verhalten: vollständig in diesem Dokument eingebetteter Funktions- und UX-Snapshot
- Zielsystem: [`justvotes` `main` auf Commit `671516a`](https://github.com/timmki/justvotes/commit/671516ae6c41376a610e65e8f97520246dec2d4f)
- Zielvertrag: [`api-contract/src/main/openapi/justvotes-v1.yaml`](https://github.com/timmki/justvotes/blob/671516ae6c41376a610e65e8f97520246dec2d4f/api-contract/src/main/openapi/justvotes-v1.yaml)
- fachliche Map: [`justvotes` Issue #1](https://github.com/timmki/justvotes/issues/1)

Nach dem Verschieben dieser Datei ist der lokale OpenAPI-Vertrag im Monorepo die autoritative technische Quelle. Bei Widersprüchen zwischen Legacy-Verhalten und den nachfolgend bestätigten Migrationsentscheidungen gilt die bestätigte Entscheidung.

## Domänensprache für die Implementierung

- **Poll:** Eine vom Admin erstellte Auswahlfrage mit mehreren nummerierten Poll Options, Lebenszyklus und Sichtbarkeit.
- **Admin:** Der authentifizierte Betreiber, der Polls erstellt, verwaltet und administrative Korrekturen ausführt.
- **Voter Identity:** Veränderbares öffentliches Pseudonym und zugleich technische Identität des Teilnehmers. Gleiche exakte Pseudonyme bezeichnen dieselbe Identität; es gibt keine zusätzliche verborgene Identity-ID.
- **Vote:** Die aktuell gültige Auswahl einer Voter Identity in einem Poll. In einem aktiven Poll kann sie ersetzt oder zurückgezogen werden.
- **Poll Results:** Aggregierte Stimmenzahlen sowie die öffentlich sichtbaren aktuellen Voter Identities und Abstimmungszeitpunkte.
- **Private Poll:** Ausschließlich für den Admin sichtbar; weder gelistet noch über einen Freigabelink erreichbar.
- **Administrative Vote Removal:** Begründete Entfernung einer Vote durch den Admin mit unveränderlichem Audit-Eintrag. Sie ist von der Vote Withdrawal des Teilnehmers zu unterscheiden.

## Eingebetteter Routen- und UX-Vertrag

Die folgenden Routenformen bleiben erhalten. Parameterwerte verwenden die opaque IDs beziehungsweise stabilen Optionsnummern des neuen Backends; alte Legacy-IDs müssen nicht aufgelöst werden.

| Route | Zielverhalten der neuen SPA |
|---|---|
| `/` | Startseite mit App-Titel, Einstieg zur Poll-Liste, Anzeige der aktiven Voter Identity in verkürzter Form, Bearbeiten-/Speichern-/Abbrechen-Aktionen und Bestätigungsdialog vor dem Identitätswechsel. Ein dezenter Link führt zu `/admin`. |
| `/polls` | Öffentliche Poll-Liste. Jede Karte zeigt Titel, Gesamtzahl aktueller Votes, Poll-ID, den lokalisierten neutralen Ersteller „Admin“ und den lokal formatierten Erstellungszeitpunkt. Klick führt zu `/poll/:pollId`. |
| `/poll/:pollId` | Poll-Titel und Sichtbarkeit, alphabetisch nach Text sortierte Poll Options, Hervorhebung der eigenen Auswahl mit blauem Zustand und Check-Symbol, Vote-Abgabe/-Ersetzung, Link zum Audit Log und – nach eigener Vote – Link zu Poll Results. Nicht gefundene oder nicht sichtbare Polls führen in den 404-Zustand. |
| `/poll/results/:pollId` | Zugriff während eines aktiven Polls nur nach eigener Vote, nach Ablauf ohne diese Voraussetzung. Zeigt Gesamtzahl, Anzahl und Prozentwert je Poll Option, Gewinner beziehungsweise Gleichstände, Vote Withdrawal, Audit-Link sowie Metadaten. Klick auf eine Option führt zur Voter-Detailroute. |
| `/poll/results/:pollId/option/:optionNumber` | Zeigt Poll-Titel, Poll Option, Optionsnummer, Gesamtzahl der Votes für diese Option und eine Tabelle aller aktuell gültigen Voter Identities mit lokal formatiertem Abstimmungsdatum und -zeit. |
| `/poll/audit/:pollId` | Öffentliche chronologische Timeline mit Ereignistyp, Akteur, lokal formatiertem Zeitpunkt und – soweit vorhanden – betroffener Poll Option. Besitzt Links zurück zum Poll und zu den Poll Results. |
| `/admin` | Login sowie nach Authentifizierung fünf Bereiche: Votes, Polls, Template Groups, Option Templates und Poll erstellen. Abgelaufene Sessions leeren geschützte Client-Caches und führen zur Loginansicht zurück. |
| `/404` | Lokalisierter Nicht-gefunden-Zustand mit sicherer Navigation zurück in die Anwendung. |
| `/create` | Wird nicht migriert. Polls werden ausschließlich im Adminbereich erstellt. |

### Legacy-Verhalten der öffentlichen Seiten

- Die Startseite zeigte die ersten acht Zeichen der Voter Identity mit Ellipse, bot Bearbeiten, Speichern und Abbrechen und verlangte vor dem Wechsel eine Bestätigung. Das Legacy-Frontend speicherte die Identität im `localStorage` und löschte Votes über einen separaten Request; beides wird ausdrücklich nicht übernommen. Die neue SPA verwendet `GET /identity` für die Anzeige und genau einen CSRF-geschützten `POST /identity` für den Wechsel.
- Die Poll-Liste bestand aus vollflächig klickbaren Karten in einer maximal etwa `42rem` breiten, einspaltigen Liste. Stimmenzahl erschien als blauer Badge; ID, Ersteller und Datum standen in einer sekundären Metadatenzeile.
- Die Poll-Detailseite sortierte Poll Options alphabetisch nach Text. Eine ausgewählte Option erhielt blauen Text, einen hellblauen Hintergrund und ein Check-Symbol; andere Optionen zeigten einen Chevron. Vote-Erfolg und -Fehler wurden als Toast gemeldet.
- Die Poll-Results-Seite bestimmte den höchsten `voteCount`; alle Optionen mit diesem Wert und mindestens einer Vote galten als Gewinner. Gewinner wurden zuerst angezeigt, übrige Optionen alphabetisch. Jede Zeile zeigte Prozentwert und absolute Anzahl und verwendete einen proportional gefüllten blauen beziehungsweise grünen Hintergrund. Bei `totalVotes = 0` muss die neue SPA `0 %` statt `NaN %` anzeigen.
- Die öffentliche Voter-Detailansicht zeigte eine laufende Zeilennummer, die vollständige Voter Identity und den Abstimmungszeitpunkt. Stimmwechsel und Withdrawals dürfen dort nicht als weiterhin aktuelle Vote erscheinen.
- Das Audit Log unterschied Poll-Erstellung, Vote-Abgabe und Vote-Entfernung visuell, zeigte Akteur und Zeitpunkt und bevorzugte den Optionstext gegenüber einer technischen Optionsreferenz.

### Legacy-Verhalten des Adminbereichs

- Nach erfolgreichem Login wurden Votes, Polls, Template Groups und Option Templates gemeinsam geladen. Der neue Login verlangt Benutzername und Passwort; der frühere Passwort-only-Flow wird nicht übernommen.
- Der Votes-Bereich zeigte drei Kennzahlen: Gesamtzahl aktueller Votes, Anzahl betroffener Polls und Anzahl unterschiedlicher Voter Identities. Darunter wurden Votes nach Poll gruppiert und mit Voter Identity, Poll Option, Zeitpunkt und Löschaktion dargestellt.
- Der Polls-Bereich listete Polls und bot Navigation zu Poll/Results sowie Löschung. Die neue SPA erweitert dies auf den im OpenAPI-Vertrag vorhandenen Lifecycle: Draft erstellen, Optionen ersetzen, veröffentlichen, privat schalten, Ablauf ändern, archivieren, aus Archiv wiederherstellen, wieder öffnen, soft löschen, wiederherstellen und permanent löschen.
- Template Groups konnten erstellt und gelöscht sowie mit Option Templates bestückt werden. Das Entfernen innerhalb einer Gruppe entfernt nur die Zuordnung, nicht das globale Option Template.
- Option Templates konnten einzeln oder kommasepariert angelegt, gesucht, in 20er-Seiten dargestellt, mehrfach ausgewählt und gelöscht werden. Die neue SPA orchestriert Batchaktionen über Einzelrequests und zeigt Erfolge, übersprungene Werte und Fehler zusammengefasst.
- Ein Poll wurde aus einer nicht leeren Template Group als Draft erstellt. Die neue SPA muss die Zielregeln zu Options-Snapshot, Ablauf und Publication statt des Legacy-Formulars verwenden.

### Visuelle und interaktive Baseline

- Schrift: selbst gehostete **Work Sans** mit Gewichten 400 bis 900 einschließlich kursiver Varianten.
- Primärfarbe: `#007AFF`; heller Seitenhintergrund: `#F2F2F7`; helle Karten: `#FFFFFF`; dunkler Seitenhintergrund: `#000000`; dunkle Karten: `#1C1C1E`; erhöhte dunkle Flächen/Trenner: `#2C2C2E`.
- Öffentliche Seiten verwenden überwiegend `rounded-2xl`, dezente Schatten, feine Trenner und maximale Inhaltsbreiten zwischen etwa `32rem` und `42rem`. Der Adminbereich darf die vorhandenen kompakteren `rounded-lg`-Tabellen und -Formulare beibehalten, soll aber dieselben Farben und Theme-Regeln verwenden.
- Der Header bleibt oben sticky, nutzt einen halbtransparenten Hintergrund mit starkem Blur und enthält optional Zurücknavigation, zentrierten Seitentitel, Sprachumschaltung `DE`/`EN` und Light/Dark-Schalter.
- Light/Dark Theme und Sprachwahl werden im Browser gespeichert. Deutsch ist Standard.
- Interaktive Elemente erhalten beim Aktivieren eine kurze Skalierung auf ungefähr `0.97` und reduzierte Opazität. Fokuszustände müssen zusätzlich WCAG 2.2 AA erfüllen und dürfen nicht nur über Farbe kommunizieren.
- Lade-, Leer-, Fehler- und 404-Zustände müssen auf jeder datenabhängigen Route explizit vorhanden sein. Mutationen verwenden verständliche Fortschritts-, Erfolgs- und Fehleranzeigen; fehlgeschlagene Mutationen dürfen optimistischen Zustand nicht als bestätigt stehen lassen.
- Alle Datums- und Zeitangaben werden mit der aktiven UI-Sprache lokal formatiert. API-Zeitstempel bleiben ISO-8601-Werte mit eindeutiger Zeitzone.
- Es gibt keine Screenshot-Baselines. Das Erscheinungsbild wird durch wiederverwendbare Layout-/Theme-Komponenten, funktionale Playwright-Tests und Axe-Prüfungen stabilisiert.

## Bestätigte Migrationsvorgaben

- Das Frontend wird eine einzelne React-/TypeScript-SPA. Öffentliche Seiten und Administration liegen in demselben Build; der Administrationsbereich liegt unter `/admin`.
- Das aktuelle Erscheinungsbild bleibt erhalten. Dazu gehören insbesondere die iOS-artige Farb- und Formensprache, Light/Dark Theme, responsive Karten und Listen sowie die deutsch/englische Oberfläche. Die Next.js-Komponentenstruktur ist keine Vorgabe.
- Der OpenAPI-Vertrag bleibt die autoritative technische Schnittstelle. Fehlende Fähigkeiten werden zuerst dort und im Backend ergänzt und danach in den generierten TypeScript-Client übernommen.
- Polls werden ausschließlich durch einen Admin erstellt; die öffentliche Erstellungsseite entfällt.
- Die SPA zeigt die aktive pseudonyme Voter-Identität weiterhin an und erlaubt ihren serverseitigen Wechsel.
- Das öffentliche Pseudonym ist zugleich die technische Voter-Identität. Eine getrennte, verborgene Identität gibt es nicht; Namenskollisionen und Nachahmung werden als bekannte Risiken akzeptiert.
- Teilnehmer dürfen ihre eigene Stimme während einer aktiven Umfrage zurückziehen.
- Aggregierte Ergebnisse werden nach eigener Stimmabgabe oder nach Ablauf der Umfrage sichtbar. Diese Regel wird serverseitig durchgesetzt.
- Nach Einsicht der Ergebnisse dürfen Teilnehmer ihre Vote weiterhin ersetzen oder zurückziehen; strategisches Abstimmen ist damit bewusst möglich.
- Die öffentliche Option-Detailansicht zeigt weiterhin alle aktuell gültigen pseudonymen Voter-Identitäten und deren Abstimmungszeitpunkte.
- Private Polls sind ausschließlich für den Admin sichtbar. Sie sind weder öffentlich gelistet noch über einen Freigabelink erreichbar.
- Der Admin kann sämtliche aktuellen Votes einsehen und einzelne Votes entfernen. Jede Entfernung verlangt eine Begründung und erzeugt einen unveränderlichen Audit-Eintrag.
- Template-Batchimport und Mehrfachlöschung bleiben clientseitig orchestrierte Einzeloperationen; serverseitige Atomarität ist nicht erforderlich.
- Bestehende öffentliche URLs für Poll, Poll Results, Audit Log und Option-Details bleiben erhalten. Die bisherige `/create`-Route entfällt.
- Die Kompatibilitätszusage gilt für die Routenformen, nicht für bereits verteilte vollständige URLs oder alte Poll-IDs. Das neue Backend benötigt keine Legacy-ID-Auflösung.
- Deutsch und Englisch bleiben vollständig unterstützt. Deutsch ist die Standardsprache; die gewählte Sprache wird im Browser gespeichert.
- Die öffentliche Erstellerangabe lautet lokalisiert „Admin“. Login- oder Anzeigenamen des konkreten Admins werden nicht über öffentliche Poll-Antworten veröffentlicht.
- Geöffnete Poll Results werden bei einem aktiven Poll ungefähr alle fünf Sekunden aktualisiert, solange der Browser-Tab sichtbar ist. Dafür wird HTTP-Polling statt WebSockets verwendet.
- Ein explizites Maven-Release-Profil generiert den TypeScript-Client, baut die SPA mit pnpm/Vite und bettet `dist/` in das Spring-Boot-JAR ein. Normale Backend-Builds führen den Node-Build nicht aus; Docker und CI verwenden das Release-Profil.
- Generierte TypeScript-Clientdateien werden nicht versioniert. `pnpm generate:api` erzeugt sie deterministisch aus der lokalen OpenAPI-Datei; CI und das Release-Profil führen die Generierung selbst aus.
- React Router verwaltet Navigation, TanStack Query den Serverzustand, React Hook Form mit Zod die Formulare, i18next die Sprachen und Tailwind CSS das Erscheinungsbild. Lokaler UI-Zustand bleibt in React; ein globales State-Framework wird nicht eingesetzt.
- Die Anwendung wird ausschließlich unter dem Root-Pfad `/` betrieben; ein konfigurierbarer Hosting-Unterpfad ist nicht erforderlich.
- Unterstützt werden die aktuelle und unmittelbar vorherige Hauptversion von Chrome, Edge, Firefox und Safari einschließlich iOS Safari.
- Barrierefreiheit hat Zielniveau WCAG 2.2 AA. Dafür notwendige Änderungen an Kontrast, Fokusdarstellung, Tastaturbedienung oder semantischer Struktur sind trotz visueller Übernahme zulässig.
- Das Erscheinungsbild wird nicht durch Screenshot- oder Pixelvergleichstests festgeschrieben. Funktionale Browser-Tests bleiben davon unberührt.
- Playwright deckt Admin-Login, Poll-Lifecycle, Vote-Abgabe, Ersetzung und Rückzug, Ergebnisfreigabe, Identitätswechsel und Administrative Vote Removal ab. Axe prüft die zentralen Seiten automatisiert auf Barrierefreiheit.
- Schriftarten, Icons und sonstige UI-Ressourcen werden mit der SPA ausgeliefert; zur Laufzeit werden keine Ressourcen von Drittanbietern geladen.
- Bei Ablauf der Admin-Session werden geschützte Query-Daten entfernt und der Nutzer zur Loginansicht geleitet. Nach erfolgreicher Anmeldung wird die ursprünglich aufgerufene Adminroute wiederhergestellt; nicht abgesendete Formulardaten werden nicht dauerhaft gespeichert.
- Die SPA ist eine reine Onlineanwendung. Es gibt keinen Service Worker, keinen PWA-Installationsmodus und keine Offline-Datenhaltung; Fehlerzustände bieten eine verständliche manuelle Wiederholung an.
- Externe Frontend-Telemetrie wird nicht eingebunden. Die erste Version verwendet Backend-JSON-Logs und die lokale Browserkonsole.
- Es gibt keinen öffentlichen Current-Vote-Endpunkt. Das Backend verwendet die Cookie-Identität zur serverseitigen Ergebnisfreigabe; die SPA liest ihr Pseudonym über `GET /identity`, hält es nur im Sitzungszustand und findet die eigene Option durch Vergleich mit der freigegebenen öffentlichen Voter-Liste.
- Unsichere Altmechanismen werden nicht als vermeintliche Funktionsparität kopiert. Dazu zählen frei übertragene fremde Nutzer-IDs, Identität im `localStorage`, Stimmenwechsel als `DELETE` plus `POST` und primitive Datenbank-IDs im Browser.

## Einordnung

- **Erforderlich**: Ohne diese Fähigkeit kann ein zentraler bestehender Nutzerfluss nicht funktionsgleich umgesetzt werden.
- **Bewertete Fähigkeit**: Die Altanwendung besitzt die Funktion, das Zielmodell schließt sie jedoch aus oder verändert ihre Semantik. Der jeweilige Eintrag dokumentiert die getroffene Entscheidung.
- **Contract-Härtung**: Kein neuer Nutzerfluss, aber Voraussetzung für einen verlässlichen generierten Client.
- **Kein Backend-Ticket**: Mit dem vorhandenen Vertrag als Frontend-Aufgabe lösbar.

### Regeln für die KI-gestützte Ticketerstellung

- Erstelle je nicht verworfenem `BE-*`, `CT-*` und `FE-*` genau ein GitHub-Ticket, sofern ein Eintrag nicht ausdrücklich als Bestandteil eines anderen Tickets markiert ist.
- Übernimm Titel, Abhängigkeiten, Umfang, Contract-Skizze, Akzeptanzkriterien und Tests in den Tickettext; fasse keine Tickets unterschiedlicher Präfixe zusammen.
- Backend-Tickets ändern zuerst OpenAPI, danach Implementierung und HTTP-/Contracttests. Der generierte Client wird niemals manuell an eine noch undokumentierte Serverantwort angepasst.
- Frontend-Tickets dürfen erst begonnen werden, wenn ihre genannten `BE-*`-/`CT-*`-Abhängigkeiten im Zielbranch verfügbar sind.
- Ein Ticket ist erst abgeschlossen, wenn Code, Tests, generierte Artefakte im Build und relevante Dokumentation konsistent sind.
- Verworfen: `BE-01`, `BE-07`, `BE-08`, `BE-11`; kein Ticket erzeugen. `BE-05` ist eine Frontend-Integration, kein Backend-Funktionsticket. `BE-09` ist Bestandteil von `BE-02`.

## Erforderliche Backend-Tickets

### BE-01 – Eigene aktuelle Stimme abfragen – verworfen

**Status:** Kein Backend-Ticket erstellen.

**Nutzerwert:** Beim erneuten Öffnen einer Umfrage erkennt die Anwendung die bestehende Auswahl und kann den passenden Abstimmungs- oder Ergebniszustand anzeigen.

**Eingebettetes Legacy-Verhalten:** Beim Laden eines Polls wurde zunächst `hasVoted = false` und `votedOptionId = null` angenommen und anschließend ein Current-Vote-Request ausgeführt. Ein Klick auf die bereits gewählte Option war ein No-op. Ein Wechsel löschte zuerst die bestehende Vote und legte danach eine neue an; Withdrawal löschte die Vote und setzte beide lokalen Zustände zurück. Fehler wurden lediglich als `false` behandelt. In der neuen SPA entfallen sowohl der Current-Vote-Request als auch der nicht atomare Delete-then-Post-Wechsel: Die eigene Option wird nach Results-Freigabe clientseitig gematcht, und der Zielvertrag übernimmt Vote-Abgabe beziehungsweise -Ersetzung atomar.

**Entscheidung:** Der Backend-Core darf `currentVote` intern verwenden, um den Results-Zugriff anhand der Cookie-Identität freizugeben, veröffentlicht dafür aber keinen eigenen HTTP-Endpunkt. Nach Freigabe der Results liest die SPA ihre Voter Identity über `GET /identity` und vergleicht sie mit den Voter Identities im Ergebnis-Readmodell. Die Identität wird nur im React-/Sitzungszustand gehalten und nicht als zweite maßgebliche Quelle im `localStorage` gespeichert.

### BE-02 – Ergebnis-Readmodell bereitstellen

**Nutzerwert:** Nutzer sehen Gesamtstimmenzahl, Stimmenzahl und Prozentanteil je Option sowie mögliche Gewinner oder Gleichstände.

**Eingebettetes Legacy-Verhalten:** Die Results-Seite erwartete ein Poll-Objekt, eine Liste `{ option, voteCount }` und `totalVotes`. Sie ermittelte `max(voteCount)`, markierte jede Option mit diesem Maximum und mindestens einer Vote als Gewinner, zeigte Gewinner zuerst und sortierte Nicht-Gewinner alphabetisch. Jede Zeile enthielt Prozentwert, absolute Zahl und einen proportional gefüllten Hintergrund. Ein Klick öffnete die Voter-Detailansicht; außerdem waren Vote Withdrawal und Audit Log erreichbar. Bei `totalVotes = 0` erzeugte die alte Prozentberechnung ungültige `NaN`-Werte, die im neuen Frontend ausdrücklich als `0 %` behandelt werden müssen.

**Vertragslücke:** Das aktuelle `Poll`-Schema enthält Optionstexte, aber keine Stimmenzahlen und keinen eigenen Ergebnis-Endpunkt.

**Akzeptanzkriterien:**

- Für eine lesbare Umfrage werden alle Optionen mit aktueller Stimmenzahl sowie die Gesamtstimmenzahl geliefert.
- Jede aktuell gültige Vote enthält für die transparente Darstellung ihre öffentliche Voter Identity und ihren Abstimmungszeitpunkt und ist der gewählten Poll Option zugeordnet.
- Eine Umfrage ohne Stimmen ist eindeutig und ohne Division-durch-null-Sonderfall darstellbar.
- Gleichstände lassen sich ohne weitere Requests korrekt bestimmen.
- Zugriffsregeln für aktive, abgelaufene, archivierte und private Umfragen sind explizit festgelegt.
- Während einer aktiven Umfrage erhält nur ein Teilnehmer mit eigener Stimme Zugriff auf die Ergebnisse; nach Ablauf sind die Ergebnisse ohne vorherige eigene Stimme sichtbar.
- Sortierung, Aktualität und Cache-Verhalten sind im Vertrag dokumentiert.
- Das Readmodell wird aus aktuellen Stimmen gebildet, nicht durch ungesichertes Replay des Audit-Logs.

**Abhängigkeiten:** BE-04 liefert der SPA die eigene Voter Identity für den clientseitigen Vergleich. Das Backend prüft die Ergebnisfreigabe unabhängig davon serverseitig anhand des Cookies.

**Contract-Skizze für das Ticket:**

- Ergänze `GET /api/v1/polls/{pollId}/results`.
- Aktiver öffentlicher Poll ohne eigene Vote: `403` Problem Details; nicht vorhandener oder privater Poll: nicht unterscheidbares `404`; abgelaufener zugänglicher Poll: `200`.
- Jede erfolgreiche und verdeckte Antwort trägt `Cache-Control: no-store`.
- Die Antwort enthält keinen `currentVote`-Wert. Minimalform:

```json
{
  "poll": {
    "id": "p_v1_opaque",
    "title": "Beispiel",
    "visibility": "PUBLIC",
    "state": "ACTIVE",
    "createdAt": "2026-08-20T12:00:00Z",
    "endsAt": "2026-08-21T12:00:00Z"
  },
  "totalVotes": 2,
  "options": [
    {
      "number": 1,
      "text": "Option A",
      "voteCount": 2,
      "votes": [
        { "userID": "alice", "votedAt": "2026-08-20T12:30:00Z" },
        { "userID": "bob", "votedAt": "2026-08-20T12:31:00Z" }
      ]
    }
  ]
}
```

**Backendtests:** Zugriff vor eigener Vote, Zugriff nach eigener Vote, Zugriff nach Ablauf, privater/nicht vorhandener Poll als `404`, Null-Vote-Poll, Gleichstand, Vote-Ersetzung, Withdrawal und stabile Zuordnung über `option.number`.

### BE-03 – Poll-Summary um Stimmenzahl und Erstellungszeitpunkt ergänzen

**Nutzerwert:** Die öffentliche Übersicht kann wie bisher Titel, Stimmenzahl, die neutrale Erstellerangabe „Admin“ und den Erstellungszeitpunkt zeigen.

**Eingebettetes Legacy-Verhalten:** Die öffentliche Übersicht zeigte eine einspaltige Liste klickbarer Karten. Eine Karte enthielt Poll-Titel, einen blauen Badge mit `totalVotes`, die Poll-ID, `createdBy` und einen anhand der aktiven Sprache formatierten `createdAt`-Zeitpunkt; Klick navigierte zu `/poll/:pollId`. Die Zielentscheidung ersetzt den konkreten `createdBy`-Wert durch den lokalisierten statischen Text „Admin“.

**Vertragslücke:** Das öffentliche `Poll`-Schema enthält weder Stimmenzahl noch Erstellungszeitpunkt. Ein öffentliches `createdBy`-Feld wird nicht benötigt, weil ausschließlich Admins Polls erstellen.

**Akzeptanzkriterien:**

- Die Listenantwort enthält die für die bestehende Karte nötigen Angaben ohne einen zusätzlichen Request pro Umfrage.
- Zeitstempel haben ein eindeutiges Format und eine definierte Zeitzonensemantik.
- Die SPA rendert die Erstellerangabe lokalisiert als „Admin“, ohne einen konkreten Login-Namen vom öffentlichen API-Vertrag zu beziehen.
- Der konkrete Admin-Akteur bleibt ausschließlich in administrativen Antworten beziehungsweise im Audit Log sichtbar.

**Abhängigkeiten:** BE-02 für Stimmenzahlen.

**Contract-Skizze für das Ticket:** Erweitere die vorhandene Antwort von `GET /api/v1/polls`; kein zusätzlicher Request je Karte. Jeder Listeneintrag enthält mindestens `id`, `title`, `createdAt`, `endsAt`, `state`, `visibility` und `totalVotes`. Ein öffentliches `createdBy`-Feld wird nicht ergänzt. `createdAt` und `endsAt` sind ISO-8601-Zeitstempel mit Offset beziehungsweise `Z`.

**Backendtests:** mehrere Polls ohne N+1-Readmodell, Poll mit null Votes, korrekte Gesamtzahl nach Vote-Ersetzung/Withdrawal sowie unveränderte Sichtbarkeitsfilter der bestehenden öffentlichen Liste.

### BE-04 – Aktive Voter-Identität lesen

**Nutzerwert:** Die Startseite kann weiterhin anzeigen, unter welcher Identität die eigenen Stimmen geführt werden.

**Eingebettetes Legacy-Verhalten:** Die Startseite zeigte die ersten acht Zeichen der User-ID mit Ellipse und bot Bearbeiten, Speichern und Abbrechen. Beim Speichern erschien ein modaler Warnhinweis. Die alte Umsetzung las und schrieb `localStorage`; die neue SPA darf dies nicht als Identitätsquelle verwenden und benötigt deshalb eine nicht cachebare Read-Fähigkeit für die eigene `HttpOnly`-Cookie-Identität.

**Vertragslücke:** `/identity` erlaubt nur eine Änderung. Das maßgebliche neue `userID`-Cookie ist `HttpOnly` und deshalb für React nicht lesbar.

**Akzeptanzkriterien:**

- Der Client kann die tatsächlich serverseitig aktive Identität ohne Änderung auslesen.
- Bei fehlender Identität ist der Zustand eindeutig erkennbar.
- Die Antwort kann ausschließlich die eigene Cookie-Identität offenlegen und ist nicht cachebar.
- Cookie und Browser-Speicher werden nicht als konkurrierende Wahrheiten geführt.

**Entscheidung:** Die Identitätsanzeige bleibt Bestandteil der SPA. Dieses Backend-Ticket ist erforderlich.

Das angezeigte Pseudonym ist zugleich die technische Identität, unter der Votes geführt werden. Zwei Browser mit demselben Pseudonym handeln daher als dieselbe Voter Identity; dieses Kollisions- und Nachahmungsrisiko ist akzeptiert. Es wird keine zusätzliche verborgene Identity-ID eingeführt.

**Abhängigkeiten:** CT-02.

**Contract-Skizze für das Ticket:**

- Ergänze `GET /api/v1/identity`; der Request verändert weder Cookie noch Votes und benötigt keinen CSRF-Token.
- Antworte immer mit `200`, `Cache-Control: no-store` und `{ "userID": "exakt" }` beziehungsweise `{ "userID": null }`, wenn kein Identity-Cookie existiert.
- Eine beliebige fremde Identity darf weder als Path- noch als Queryparameter angefragt werden können.

**Backendtests:** fehlendes Cookie, gültiges Cookie mit Großschreibung und Unicode, keine `Set-Cookie`-Nebenwirkung, `no-store` und keine CSRF-Anforderung bei `GET`.

### BE-05 – Identitätswechsel integrieren – bereits implementiert

**Status:** Kein Backend-Funktionsticket erstellen; die SPA integriert die vorhandene Fähigkeit.

**Nutzerwert:** Der Nutzer versteht zuverlässig, welche bisherigen Stimmen beim Wechsel der Identität entfernt werden.

**Eingebettetes Legacy-Verhalten:** Der Bestätigungsdialog versprach, beim Identitätswechsel die bisherigen Votes der alten Identität zu löschen. Der Client führte dafür zuerst einen separaten Delete-All-Request mit frei übermittelter User-ID aus und schrieb erst danach `localStorage`. Dieser unsichere Zwei-Schritt-Ablauf wird nicht übernommen; die neue SPA delegiert Wechsel, Vote-Entfernung und Audit vollständig an einen einzelnen transaktionalen Backendaufruf.

**Vorhandene Backendfähigkeit:** `POST /identity` übernimmt die neue Voter Identity exakt, entfernt innerhalb einer Transaktion die bisherigen Votes der alten Identität aus öffentlichen aktiven Polls und erzeugt dafür Audit-Ereignisse. Votes aus abgeschlossenen Polls und die Historie bleiben erhalten. Bei fehlender alter Identität oder unverändertem Wert werden keine Votes entfernt.

**Frontend-Akzeptanzkriterien:**

- Die SPA zeigt vor dem Wechsel die bestätigte Warnung über die Auswirkungen auf aktive Votes.
- Sie lädt einen CSRF-Token und sendet genau einen `POST /identity` mit `credentials: same-origin`; sie führt keinen zusätzlichen Vote-Delete-Aufruf aus.
- Eingaben werden als 1 bis 64 Unicode-Zeichen validiert; Groß-/Kleinschreibung und sonstige Zeichen bleiben erhalten.
- Nach `204 No Content` werden Identity-, Poll- und Results-Caches verworfen und die Identität über BE-04 erneut geladen.
- `400`-Problem-Details und CSRF-Fehler werden verständlich angezeigt, ohne den lokalen Sitzungszustand vorzeitig umzuschalten.

**Contract-Härtung:** Cookieattribute, CSRF-`403` und das Verhalten bei fehlender beziehungsweise unveränderter Identität werden über CT-01 bis CT-03 dokumentiert.

**Nicht übernehmen:** Der alte öffentliche Endpunkt zum Löschen aller Stimmen einer frei übermittelten User-ID darf nicht wieder eingeführt werden.

## Bewertete zusätzliche Backend-Fähigkeiten

### BE-06 – Eigene Stimme zurückziehen

**Status:** Umsetzung bestätigt.

**Nutzerwert:** Ein Teilnehmer kann seine Stimme vollständig entfernen, statt sie nur auf eine andere Option zu verschieben.

**Eingebettetes Legacy-Verhalten:** Die Results-Seite bot unter den Metadaten die Aktion „Stimme zurücknehmen“ an. Sie war nur aktiv, wenn der lokale Zustand eine bestehende Vote meldete, zeigte während der Mutation einen Fortschritts-Toast und navigierte nach Erfolg zurück zur Poll-Detailseite. Die neue SPA bestimmt die eigene Vote aus Identity plus Ergebnis-Readmodell und verwendet einen atomaren, cookiegebundenen Withdrawal-Endpunkt.

**Vertragslücke:** Der neue Vertrag unterstützt nur atomare Abgabe beziehungsweise Ersetzung einer Stimme.

**Entscheidung:** Eine Stimme darf ausschließlich während einer aktiven Umfrage zurückgezogen werden.

Ein Teilnehmer darf auch nach Einsicht der aktuellen Ergebnisse ersetzen oder zurückziehen. Die dadurch mögliche strategische Stimmabgabe ist beabsichtigt.

**Akzeptanzkriterien:**

- Ein identifizierter Teilnehmer kann ausschließlich die eigene Stimme entfernen.
- Der Vorgang ist ohne vorhandene Stimme idempotent oder eindeutig dokumentiert.
- Ergebnisprojektion und eigener Stimmstatus sind anschließend konsistent.
- Ein Audit-Eintrag enthält Akteur, vorherige Auswahl und Zeitpunkt.

**Contract-Skizze für das Ticket:** Ergänze `DELETE /api/v1/polls/{pollId}/votes`. Die Voter Identity stammt ausschließlich aus dem Cookie; der Request benötigt CSRF und keinen Body. Erfolgreiche Entfernung und fehlende eigene Vote sind idempotent `204`. Nicht vorhandener beziehungsweise verborgener Poll liefert `404`; ein nicht aktiver Poll liefert einen typisierten Zustandsfehler. Die Operation gibt keine fremde Vote zurück.

**Backendtests:** eigene Vote entfernt, fremde Votes unverändert, Wiederholung idempotent, aktiver/abgelaufener/privater Poll, Ergebniszahl aktualisiert, Audit-Eintrag korrekt und CSRF erzwungen.

### BE-07 – Private Umfragen über Freigabelink zugänglich machen – verworfen

**Status:** Kein Backend-Ticket erstellen.

**Nutzerwert:** Eine nicht öffentlich gelistete Umfrage kann gezielt geteilt und verwendet werden.

**Heutiges Verhalten:** `private` verhindert lediglich die Aufnahme in die öffentliche Liste; ein direkter Link bleibt erreichbar.

**Entscheidung:** „Privat“ bedeutet administrativ und nicht öffentlich. Ein privater Poll ist ausschließlich für den Admin erreichbar, erscheint in keiner öffentlichen Liste und kann nicht über einen Freigabelink gelesen oder abgestimmt werden. Das Verhalten des neuen Backends ist damit die gewünschte Semantik.

### BE-08 – Öffentliche Poll-Erstellung – verworfen

**Status:** Kein Backend-Ticket erstellen.

**Nutzerwert:** Ein normaler Besucher kann eine eigene Umfrage mit frei eingegebenen Optionen erstellen und teilen.

**Eingebettetes Legacy-Verhalten:** `/create` enthielt ein öffentliches Formular mit nicht leerem Titel, zwei bis sechs frei editierbaren Optionen, `createdBy` mit Standard „anonymous“ und Sichtbarkeit mit Standard `private` sowie Auswahl `private`/`public`. Optionen konnten einzeln hinzugefügt, geändert und entfernt werden. Nach Erfolg erschien ein Toast und die Route wechselte zu `/poll/:pollId`. Das Formular übermittelte kein Ablaufdatum, obwohl die spätere Legacy-Validierung eines verlangte. Die gesamte Route und dieses Erstellungsmodell werden nicht migriert.

**Konflikt zum Zielmodell:** Das neue Backend erlaubt die Erstellung nur dem Admin und verlangt eine nicht leere Vorlagengruppe.

**Entscheidung:** Polls werden ausschließlich durch einen Admin erstellt. Die öffentliche Erstellungsseite wird nicht migriert. Eine spätere Wiedereinführung erfordert eine neue Fachentscheidung und ein neues Ticket; sie ist nicht Teil der aktuellen Migration.

### BE-09 – Aktuelle Voter je Option veröffentlichen – in BE-02 enthalten

**Status:** Kein separates Backend-Ticket erstellen; die Fähigkeit ist Bestandteil von BE-02.

**Nutzerwert:** Teilnehmer können sehen, welche pseudonymen Identitäten wann für eine Option gestimmt haben.

**Eingebettetes Legacy-Verhalten:** Die Option-Detailseite zeigte Optionstext als Titel, Poll-Titel, Optionsnummer und Gesamtzahl der Votes. Eine Tabelle enthielt laufende Nummer, vollständige Voter Identity und lokal formatiertes Abstimmungsdatum samt Uhrzeit. Bei null Votes erschien ein eigener Leerzustand. Die alte Seite aktualisierte ihre statischen Daten in einem kurzen Revalidierungsintervall; die neue SPA verwendet stattdessen das gemeinsame Results-Query und sichtbarkeitsabhängiges HTTP-Polling.

**Vertragslücke:** Das Audit-Log ist eine Ereignishistorie, aber kein vertraglich belastbares Readmodell der aktuell gültigen Stimmen. BE-02 schließt diese Lücke mit einem Ergebnis-Readmodell, das Votes den Poll Options zuordnet.

**Entscheidung:** Die bestehende öffentliche Detailansicht bleibt erhalten und zeigt für jede aktuell gültige Stimme die vollständige pseudonyme Identität und den Abstimmungszeitpunkt.

**Akzeptanzkriterien innerhalb von BE-02:**

- Poll und Optionsnummer liefern ausschließlich aktuell gültige Stimmen.
- Stimmwechsel und Rückzüge erscheinen nicht als weiterhin gültige Stimme.
- Sichtbarkeit, Reihenfolge und Nicht-Cachebarkeit sind festgelegt.
- Die API verwendet die stabile Optionsnummer, keine alte Datenbank-ID.
- Die Detailansicht folgt derselben Ergebnisfreigabe: während einer aktiven Umfrage erst nach eigener Stimmabgabe, nach Ablauf ohne diese Voraussetzung.
- Die erhaltene Option-Detailroute lädt das Ergebnis-Readmodell und filtert die gewünschte Optionsnummer; ein zusätzlicher Current-Vote-Endpunkt ist dafür nicht nötig.

### BE-10 – Administrative Stimmenübersicht und Einzellöschung

**Status:** Umsetzung bestätigt.

**Nutzerwert:** Der Admin kann Stimmen prüfen, aggregierte Kennzahlen sehen und eine konkrete fehlerhafte Stimme entfernen.

**Eingebettetes Legacy-Verhalten:** Der Admin-Votes-Bereich zeigte Kennzahlen für Gesamtzahl der Votes, Anzahl betroffener Polls und Anzahl unterschiedlicher Voter Identities. Votes wurden nach Poll-Titel gruppiert; jede Gruppe zeigte ihre Anzahl und eine Tabelle mit verkürzt dargestellter Voter Identity, Poll Option, lokal formatiertem Zeitpunkt und Löschaktion. Lade- und Leerzustände waren vorhanden. Die Legacy-Löschung verlangte keine Begründung; die neue SPA muss vor dem Senden eine Pflichtbegründung erfassen und nach Erfolg Kennzahlen, Liste und Poll Results invalidieren.

**Vertragslücke:** Es existieren weder eine administrative Stimmenliste noch eine stabile öffentliche Vote-ID oder ein administrativer Löschbefehl.

**Entscheidung:** Der Admin darf fremde Votes entfernen. Eine Begründung ist verpflichtend; die Entfernung muss in einem unveränderlichen Audit-Eintrag nachvollziehbar bleiben.

**Akzeptanzkriterien:**

- Eine Admin-Session kann aktuelle Stimmen mit Poll, Option, Identität und Zeitpunkt paginiert auflisten.
- Eine konkrete Stimme kann mit CSRF-Schutz entfernt werden.
- Löschung aktualisiert Ergebnisse und erzeugt einen unveränderlichen Audit-Eintrag mit Admin-Akteur, Pflichtbegründung, betroffener Vote und Zeitpunkt.
- Der Vertrag dokumentiert Paging, Autorisierung und Fehlerantworten.

**Contract-Skizze für das Ticket:**

- Ergänze eine paginierte Adminabfrage wie `GET /api/v1/admin/votes?page=0&size=50`. Jeder Eintrag besitzt eine opaque `voteId`, `userID`, `votedAt`, Poll `{ id, title }` und Option `{ number, text }`; zusätzlich liefert die Antwort `totalElements`.
- Ergänze `DELETE /api/v1/admin/votes/{voteId}` mit JSON-Body `{ "reason": "..." }`. `reason` ist getrimmt, nicht leer und längenbegrenzt. Die Mutation benötigt Admin-Session und CSRF.
- Erfolg liefert `204`; unbekannte Vote `404`; fehlende/ungültige Begründung `400`; fehlende Authentifizierung beziehungsweise Berechtigung typisierte `401`/`403` Problem Details.

**Backendtests:** Pagination, stabile Sortierung, Pflichtbegründung, erfolgreiche Entfernung, Ergebnisprojektion aktualisiert, unveränderlicher Audit-Eintrag vollständig, doppelte Entfernung, Authentifizierung und CSRF.

### BE-11 – Atomare Batchoperationen für Optionsvorlagen – verworfen

**Status:** Kein Backend-Ticket erstellen.

**Nutzerwert:** Mehrere Vorlagen können gemeinsam importiert oder entfernt werden, ohne schwer verständliche Teilzustände zu erzeugen.

**Heutiges Verhalten:** Die Admin-Oberfläche importiert kommaseparierte Vorlagen und verarbeitet Mehrfachauswahlen.

**Entscheidung:** Der neue Vertrag bleibt bei Einzeloperationen. Die SPA führt sie nacheinander beziehungsweise mit begrenzter Parallelität aus und fasst Erfolge, übersprungene Einträge und Fehler für den Nutzer zusammen. Teilzustände werden akzeptiert und sichtbar gemacht.

## Contract-Härtung vor der TypeScript-Clientgenerierung

### CT-01 – CSRF- und Session-Ablauf vollständig beschreiben

- `POST /admin/login` benötigt in der Runtime bereits CSRF-Cookie und `X-XSRF-TOKEN`, deklariert dies aber nicht als Security Requirement.
- `POST /identity` ist ebenfalls CSRF-geschützt; der Identity-Pfad dokumentiert die mögliche `403`-Antwort noch nicht.
- `/csrf` dokumentiert den JSON-Body, nicht jedoch das dabei gesetzte Cookie.
- Login dokumentiert das entstehende Session-Cookie nicht.
- Gemeinsame `401`- und `403`-Antworten fehlen an mehreren Adminoperationen.

**Akzeptanz:** Der OpenAPI-Vertrag beschreibt Bootstrap, Login, Identity-Wechsel, weitere Mutation und Logout so vollständig, dass ein Client ohne Spring-spezifisches Zusatzwissen implementiert werden kann. HTTP-Tests beweisen mindestens Login und Identity-Wechsel mit fehlendem, falschem und gültigem Token.

### CT-02 – Cookievertrag festschreiben

- Für `userID` werden der codierte exakte Wert, `Path=/`, zehn Jahre Lebensdauer, `HttpOnly`, `SameSite=Lax` und `Secure` bei HTTPS dokumentiert.
- Namen, Lebensdauer, Path, `SameSite`, `Secure` und `HttpOnly` für Session- und CSRF-Cookies werden dokumentiert.
- Das Verhalten hinter einem TLS-terminierenden Reverse Proxy ist festgelegt und getestet.
- Der generierte Client beziehungsweise seine Fetch-Abstraktion sendet Same-Origin-Credentials bewusst mit.

**Akzeptanz:** OpenAPI-Beschreibungen und fokussierte HTTP-Tests stimmen mit den tatsächlich gesetzten `Set-Cookie`-Headern überein; Reverse-Proxy-HTTPS führt zu den erwarteten `Secure`-Attributen.

### CT-03 – Problem-Details und Statusmatrix vervollständigen

- Für `400`, `401`, `403`, `404`, `405`, `409` und `415` werden wiederverwendbare Responses definiert.
- Frameworkfehler und fachliche Fehler erfüllen dasselbe Problem-Schema.
- Ungültige opaque IDs, fehlende Ressourcen und Zustandskonflikte sind pro Operation dokumentiert.
- Contracttests validieren nicht nur den Content-Type, sondern das Antwortschema.

**Akzeptanz:** Eine zentrale Statusmatrix ordnet jeder Operation ihre real möglichen Antworten zu; repräsentative Tests für Framework- und Fachfehler validieren `application/problem+json` einschließlich `type`, `title`, `status` und stabilem maschinenlesbarem `code`.

### CT-04 – Nicht-Cachebarkeit verdeckter Antworten absichern

- Öffentliche `404`-Antworten für private oder nicht vorhandene Umfragen werden im Vertrag als `no-store` beschrieben.
- Ein fokussierter HTTP-Test sichert das tatsächliche Verhalten ab.
- Die Fachregel hängt nicht unbemerkt von Spring-Security-Defaults ab; falls nötig setzt der Adapter den Header explizit.

**Akzeptanz:** HTTP-Tests sichern `no-store` für erfolgreiche personenbezogene Antworten sowie öffentliche `404`-/`403`-Antworten ab; OpenAPI beschreibt den Header bei allen betroffenen Responses.

### CT-05 – Schemas für einen exhaustiven TypeScript-Client schärfen

- `visibility`, Poll-Zustand, Vote-Status und Audit-Ereignis werden als geschlossene Enums statt als beliebige Strings beschrieben.
- Listen- und Audit-Reihenfolgen werden festgelegt, soweit die UI davon abhängt.
- Zeitstempelpräzision und Zeitzonensemantik sind widerspruchsfrei.
- Der Client kann Zustände über discriminated unions beziehungsweise exhaustive handling verarbeiten.

**Akzeptanz:** Nach Clientgenerierung entstehen geschlossene TypeScript-Typen für Zustände und Ereignisse; ein Compile-Test beweist exhaustives Handling, und keine Featurekomponente muss bekannte Enumwerte als freie Strings behandeln.

### CT-06 – Snapshot der Vorlagengruppe vollständig persistieren

**Vertrags- und Implementierungslücke:** `Poll.templateGroup.description` ist erforderlich, der aktuelle Mapper liefert jedoch immer einen leeren String. Name und Beschreibung sollen auch nach Änderung oder Löschung der ursprünglichen Gruppe als Snapshot erhalten bleiben.

**Akzeptanz:** Domainmodell, vorwärtsgerichtete Migration, Persistenzmapping, HTTP-Mapping und Integrationstest bewahren Name und Beschreibung des Snapshots gemeinsam.

## Bewusst nicht zu übernehmende Altmechanismen

- User-ID im `localStorage` oder als frei wählbare Identität in Vote-Requests
- Löschen der Stimmen einer frei übermittelten fremden User-ID
- Stimmenwechsel durch nicht atomare Folge von `DELETE` und `POST`
- numerische Datenbank-IDs für Polls, Vorlagen oder Optionen im Browser
- reiner Passwort-Login ohne Benutzernamen
- unmittelbare harte Poll-Löschung ohne Soft Delete, Restore und getrennte Permanent-Delete-Bestätigung
- öffentliche Poll-Erstellung durch normale Besucher
- nicht gelistete oder per Geheimlink teilbare private Polls
- getrennte verborgene Identity-ID neben dem öffentlichen Pseudonym

## Kein Backend-Ticket erforderlich

Mit dem vorhandenen Vertrag kann die SPA bereits Folgendes umsetzen:

- Routing, Navigation, 404-Seite und Spring-seitiger Deep-Link-Fallback
- Beibehaltung der bisherigen Routenformen ohne Unterstützung alter Poll-IDs
- deutsches und englisches UI, Light/Dark Theme, Icons, Toasts und Ladezustände
- Admin-Login mit Benutzername, Sessionprüfung und Logout
- vorhandenen serverseitigen Identitätswechsel über einen einzelnen CSRF-geschützten `POST /identity` integrieren
- Templates und Gruppen listen, erstellen, umbenennen, löschen und zuordnen
- Poll-Draft aus einer Vorlagengruppe erstellen und Optionen ersetzen
- Poll veröffentlichen, privat schalten, Ablauf ändern, archivieren, wiederherstellen, erneut öffnen, soft löschen und permanent löschen
- Stimme atomar abgeben oder auf eine andere Option wechseln
- Audit-Timeline anzeigen
- sichtbarkeitsabhängiges HTTP-Polling für aktive Poll Results
- clientseitige Ermittlung der eigenen Poll Option aus `GET /identity` und dem freigegebenen Ergebnis-Readmodell
- Suche, Auswahl und clientseitige Paginierung kleiner Templatebestände
- Template-Batchimport und Mehrfachlöschung durch clientseitige Einzeloperationen mit zusammengefasstem Ergebnis

## Frontend-Ausführungsbacklog

Die folgenden Tickets werden im neuen Monorepo umgesetzt. Jeder Ticketabschluss umfasst Typecheck, relevante Vitest-/React-Testing-Library-Tests und aktualisierte Playwright-Flows. Fachliche HTTP-Aufrufe dürfen ausschließlich über den generierten Client beziehungsweise eine dünne gemeinsame Fetch-Konfiguration erfolgen.

### FE-00 – Frontend-Projekt und Release-Integration anlegen

**Abhängigkeiten:** CT-01 bis CT-05 für einen belastbaren generierten Client.

**Umfang:**

- Lege `frontend/` als pnpm-/Vite-/React-/TypeScript-Projekt an; aktiviere strikte TypeScript-Prüfung.
- Stelle mindestens `dev`, `build`, `typecheck`, `lint`, `test`, `test:e2e` und `generate:api` als pnpm-Skripte bereit.
- Generiere den Client aus `api-contract/src/main/openapi/justvotes-v1.yaml` in ein ignoriertes Verzeichnis wie `src/shared/api/generated/`; generierte Dateien werden nicht eingecheckt oder manuell editiert.
- Konfiguriere den Vite-Devserver so, dass `/api` same-origin-artig an Spring Boot weitergeleitet wird.
- Lege Quellgrenzen an: `src/app` für Composition/Router, `src/features/polls`, `src/features/identity`, `src/features/admin`, `src/features/template-catalog`, `src/shared/api`, `src/shared/i18n` und `src/shared/ui`.
- Integriere den Build in das Maven-Release-Profil und stelle sicher, dass `dist/` in Spring Boot Static Resources landet.
- Ergänze den Spring-SPA-Fallback für Clientrouten; `/api/**`, `/actuator/**` und vorhandene Dateien dürfen niemals auf `index.html` fallen.

**Akzeptanz:** `pnpm build` erzeugt reproduzierbare Assets; der vollständige Maven-Release-Build erzeugt ein ausführbares JAR; das Docker-Runtime-Image startet nur Java; direkter Aufruf jeder erhaltenen Clientroute liefert die SPA.

### FE-01 – App Shell, Theme und Lokalisierung implementieren

**Abhängigkeiten:** FE-00.

**Umfang:**

- Implementiere Router, globales Fehlerboundary, Query Client, Toast-/Benachrichtigungsfläche und die Routen aus dem eingebetteten UX-Vertrag.
- Übernimm die dokumentierten Farben, Flächen, Radien und Press-Interaktion als Tailwind-Tokens beziehungsweise gemeinsame UI-Komponenten.
- Bette Work Sans lokal ein; es dürfen keine Runtime-Requests an Font- oder Asset-CDNs entstehen.
- Implementiere den sticky Header mit Zurücknavigation, Titel, `DE`/`EN` und Theme-Schalter.
- Portiere die sieben Übersetzungsbereiche `common`, `polls`, `notifications`, `forms`, `errors`, `audit` und `admin`; Deutsch ist Default, Sprach- und Themeauswahl werden im Browser gespeichert.
- Stelle WCAG 2.2 AA für Fokus, Kontrast, semantische Überschriften, Labels, Statusmeldungen und Tastaturnavigation sicher.

**Akzeptanz:** Alle Routen besitzen Loading-, Error- und 404-Grundzustände; Light/Dark und DE/EN funktionieren nach Reload; Axe meldet für App Shell und Navigation keine kritischen Verstöße.

### FE-02 – Gemeinsame API-, CSRF- und Session-Infrastruktur implementieren

**Abhängigkeiten:** FE-00, CT-01 bis CT-05.

**Umfang:**

- Konfiguriere alle Requests relativ zu `/api/v1` und mit `credentials: same-origin`; es gibt keine konfigurierbare externe API-Base-URL.
- Implementiere einmalig den CSRF-Bootstrap: Token und Headername laden, für Mutationen verwenden und nach Sessionwechsel erneuern.
- Normalisiere Problem Details in eine gemeinsame Frontend-Fehlerform, ohne fachliche Statuscodes in Komponenten zu duplizieren.
- Definiere Query Keys für Identity, Public Polls, Poll, Poll Results, Audit, Admin Session, Admin Votes, Admin Polls, Templates und Groups.
- Bei Admin-`401` geschützte Caches löschen, Zielroute merken und zum Login wechseln; nach Login zur Zielroute zurückkehren.
- Netzwerkfehler zeigen Retry an. Vorhandene gecachte Daten dürfen nicht ohne sichtbaren Stale-Zustand als aktuell ausgegeben werden.

**Akzeptanz:** Komponenten verwenden keine direkten `fetch`-Aufrufe; CSRF wird in einem Integrationstest für Login und mindestens eine weitere Mutation bewiesen; Sessionablauf legt keine geschützten Daten offen.

### FE-03 – Startseite und Voter-Identity-Wechsel implementieren

**Abhängigkeiten:** FE-01, FE-02, BE-04, vorhandener `POST /identity`.

**Umfang:**

- Lade die aktive Voter Identity über `GET /identity`; zeige bei vorhandenem Wert die ersten acht Zeichen plus Ellipse und biete Bearbeiten, Speichern und Abbrechen.
- Halte die geladene Identität ausschließlich im Query-/React-Sitzungszustand. `localStorage` darf nicht zur technischen Identitätsquelle werden.
- Validiere 1 bis 64 Unicode-Zeichen; zeige nach Erfolg den serverseitig unveränderten Wert.
- Zeige vor einer echten Änderung einen modalen Hinweis, dass Votes aus öffentlichen aktiven Polls entfernt und auditiert werden, abgeschlossene Historie aber erhalten bleibt.
- Sende genau einen CSRF-geschützten `POST /identity`. Nach `204` Identity-, Poll- und Results-Queries invalidieren und Identity erneut laden.
- Biete primäre Navigation zu `/polls` und dezente Navigation zu `/admin`.

**Akzeptanz:** Erstsetzung ohne Cookie, No-op bei gleichem Wert, erfolgreicher Wechsel, `400`, CSRF-Fehler und Netzwerkfehler sind getestet; kein Vote-Delete-Request wird vom Client gesendet.

### FE-04 – Öffentliche Poll-Liste implementieren

**Abhängigkeiten:** FE-01, FE-02, BE-03.

**Umfang:**

- Lade `GET /polls` über TanStack Query und rendere die dokumentierte einspaltige Kartenliste.
- Zeige Titel, `totalVotes`, opaque Poll-ID, lokalisierten Text „Admin“ und lokal formatiertes `createdAt`.
- Klick beziehungsweise Tastaturaktivierung navigiert zu `/poll/:pollId`.
- Implementiere Skeleton/Loading, verständlichen Leerzustand, Fehler mit Retry und `no-store`-gerechtes Query-Verhalten.

**Akzeptanz:** Karten funktionieren per Maus und Tastatur; null Votes, lange Titel und mobile Breite sind abgedeckt; es entsteht kein zusätzlicher Request pro Karte.

### FE-05 – Poll-Detail und atomare Vote-Abgabe implementieren

**Abhängigkeiten:** FE-02, FE-03, vorhandene Public-Poll- und Cast-Vote-Operationen, BE-02 für Wiederherstellung nach Reload.

**Umfang:**

- Lade Poll und Poll Options; sortiere Optionen alphabetisch zur Anzeige, verwende für Mutationen jedoch die stabile `option.number`.
- Versuche Poll Results zu laden. `200` erlaubt den Match der eigenen Voter Identity und markiert die eigene Option; ein erwartetes `403` bedeutet bei einem aktiven Poll „noch nicht abgestimmt“ und ist kein globaler Fehlerzustand.
- Sende Vote-Abgabe/-Ersetzung atomar über den vorhandenen POST; baue keinen Delete-then-Post-Ablauf.
- Behandle die Backendstatus `created`, `replaced` und `unchanged`, aktualisiere Auswahl und invalidiere Liste, Poll Results und Audit.
- Deaktiviere Vote-Aktionen für nicht aktive Polls und zeige Ablauf beziehungsweise Zustand verständlich.
- Zeige Results-Link erst nach erfolgreicher Ergebnisfreigabe; Audit bleibt entsprechend der öffentlichen Backendregel erreichbar.

**Akzeptanz:** Erstvote, Wechsel, Klick auf dieselbe Option, Reload mit vorhandener Vote, abgelaufener Poll, verborgener Poll und Mutationsfehler sind abgedeckt.

### FE-06 – Poll Results, Voter-Details und Vote Withdrawal implementieren

**Abhängigkeiten:** FE-02, FE-03, BE-02, BE-06.

**Umfang:**

- Rendere Gesamtzahl, `voteCount` und Prozentwert je Option; bei `totalVotes = 0` immer `0 %`.
- Bestimme Gewinner als alle Optionen mit maximaler positiver Stimmenzahl; zeige Gewinner zuerst, danach Nicht-Gewinner alphabetisch.
- Ermittle die eigene Option durch Vergleich der `GET /identity`-Antwort mit den Voter Identities im Results-Readmodell.
- Aktualisiere aktive Results etwa alle fünf Sekunden, aber nur bei sichtbarem Browser-Tab; stoppe Polling für nicht aktive Polls und während Offline-/Fehlerzuständen.
- Erhalte `/poll/results/:pollId/option/:optionNumber`; filtere dort das bereits geladene Ergebnis-Readmodell und zeige vollständige aktuelle Voter Identities mit Zeitpunkten. Ein direkter Deep Link lädt dasselbe Readmodell neu.
- Implementiere Vote Withdrawal mit Bestätigung, CSRF und idempotentem DELETE; nach Erfolg Poll, Results, Liste und Audit invalidieren und zur Poll-Detailseite navigieren.

**Akzeptanz:** Zugriff vor eigener Vote, Zugriff nach Vote, Zugriff nach Ablauf, null Votes, Gleichstand, Live-Aktualisierung, Wechsel, Withdrawal, direkter Option-Deep-Link und vollständige öffentliche Voterliste sind in Playwright abgedeckt.

### FE-07 – Öffentliches Audit Log implementieren

**Abhängigkeiten:** FE-01, FE-02, vorhandene Audit-Operation.

**Umfang:**

- Rendere eine chronologische Timeline mit lokalisiertem Ereignisnamen, Akteur, Zeitpunkt und betroffener Poll Option.
- Unterscheide mindestens Poll-Erstellung, Vote-Abgabe, Vote-Ersetzung/-Entfernung, Identitätswechsel und Administrative Vote Removal, soweit der Zielvertrag diese Ereignisse liefert.
- Zeige einen eigenen Leerzustand; navigiere zurück zum Poll und zu Poll Results.
- Leite Anzeige und Sortierung aus den typisierten Audit-Enums und der vertraglich festgelegten Reihenfolge ab.

**Akzeptanz:** Timeline ist per Tastatur lesbar, lange Identitäten brechen das Layout nicht, unbekannte Ereignisse erhalten einen sicheren generischen Fallback.

### FE-08 – Admin-Login und geschützte App Shell implementieren

**Abhängigkeiten:** FE-01, FE-02, vorhandene Sessionoperationen.

**Umfang:**

- Prüfe die Admin-Session beim Einstieg in `/admin`; zeige währenddessen keinen geschützten Inhalt.
- Loginformular erfasst Benutzername und Passwort, lädt CSRF und behandelt `204`, `400`, `401` und `403` ohne Passwortpersistenz.
- Nach Login Daten der initial sichtbaren Adminbereiche laden; nach Logout alle geschützten Queries entfernen.
- Implementiere die fünf Bereiche Votes, Polls, Template Groups, Option Templates und Poll erstellen als zugängliche Tabs beziehungsweise Unterrouten.
- Bei Sessionablauf Login anzeigen und nach erneuter Authentifizierung zur zuvor aktiven Adminroute zurückkehren; nicht abgesendete Formwerte werden verworfen.

**Akzeptanz:** Login, falsche Credentials, CSRF-Fehler, Reload mit aktiver Session, Sessionablauf und Logout sind in Playwright abgedeckt.

### FE-09 – Template Catalog verwalten

**Abhängigkeiten:** FE-08, vorhandene Template-/Group-Operationen.

**Umfang:**

- Option Templates listen, suchen, clientseitig in 20er-Seiten darstellen, einzeln erstellen/umbenennen/löschen und mehrfach auswählen.
- Kommaseparierten Batchimport in normalisierte Einzelwerte zerlegen, leere Werte ignorieren und Einzelrequests mit begrenzter Parallelität ausführen.
- Ergebnis als `erstellt`, `übersprungen` und `fehlgeschlagen` zusammenfassen; Teilzustände sind erlaubt und sichtbar.
- Template Groups listen, erstellen, umbenennen und löschen; Mitglieder separat laden, hinzufügen und entfernen.
- Entfernen aus einer Group löscht ausschließlich die Zuordnung. Globales Löschen eines Option Templates erfordert eine getrennte explizite Aktion.

**Akzeptanz:** Teilfehler im Batch, Duplikate, Gruppenzuordnung/-entfernung, Mehrfachauswahl, Suche und Pagination sind komponentengetestet.

### FE-10 – Admin-Poll-Lifecycle implementieren

**Abhängigkeiten:** FE-08, CT-05, vorhandene Admin-Poll-Operationen.

**Umfang:**

- Polls mit Titel, Sichtbarkeit, Zustand, Ablauf und Template-Group-Snapshot listen und nach Mutation aktualisieren.
- Draft aus einer nicht leeren Template Group erstellen; Optionen anzeigen/ersetzen und Ablauf setzen, bevor Publication angeboten wird.
- Aktionen nur in fachlich zulässigen Zuständen anbieten: veröffentlichen, privat schalten, Ablauf ändern, archivieren, aus Archiv wiederherstellen, wieder öffnen, soft löschen, wiederherstellen und permanent löschen.
- Destruktive Aktionen erhalten Bestätigungsdialoge; Permanent Delete benötigt die vom Zielvertrag verlangte zusätzliche Bestätigung.
- Öffentliche Poll-/Results-/Audit-Routen aus der Adminliste in neuem beziehungsweise gleichem Tab erreichbar machen, ohne primitive Datenbank-IDs zu verwenden.

**Akzeptanz:** Kritische Zustandsübergänge sind als Komponententests abgedeckt; ein Playwright-Flow führt einen Poll von Draft über Publication und Ablauf/Archiv bis zur Wiederherstellung.

### FE-11 – Administrative Votes verwalten

**Abhängigkeiten:** FE-08, BE-10.

**Umfang:**

- Rendere Gesamtzahl aktueller Votes, Anzahl betroffener Polls und Anzahl unterschiedlicher Voter Identities aus der paginierten Antwort beziehungsweise abgeleiteten Daten.
- Liste Votes gruppiert oder filterbar nach Poll; zeige Voter Identity, Poll Option und lokalen Zeitpunkt.
- Administrative Vote Removal öffnet einen Dialog mit verpflichtender Begründung und zeigt an, dass die Aktion auditiert wird.
- Nach Erfolg Admin-Votes, öffentliche Poll-Liste, Poll Results und Audit invalidieren; nach Fehler bleibt die Vote sichtbar und die Begründung zur Korrektur erhalten.

**Akzeptanz:** Pagination, Kennzahlen, Pflichtbegründung, erfolgreiche Entfernung, Backendvalidierung, Auth-/CSRF-Fehler und aktualisierte öffentliche Results sind getestet.

### FE-12 – Qualitäts- und Release-Gates abschließen

**Abhängigkeiten:** FE-00 bis FE-11 sowie alle erforderlichen BE-/CT-Tickets.

**Umfang:**

- Führe Typecheck, Lint, Vitest/React Testing Library, Playwright und Axe in CI aus.
- Playwright umfasst mindestens Admin-Login, Poll-Lifecycle, Identity-Wechsel, Vote `created/replaced/unchanged`, Results-Freigabe, Live-Refresh, Withdrawal und Administrative Vote Removal.
- Prüfe die aktuelle und vorherige Hauptversion von Chrome, Edge, Firefox und Safari einschließlich iOS Safari soweit die CI-Infrastruktur dies erlaubt.
- Verifiziere, dass keine Runtime-Requests zu Drittanbieterfonts, Analytics oder Telemetriediensten stattfinden.
- Baue das Docker-Image, starte es mit temporärem SQLite-Volume und prüfe `/`, eine direkte SPA-Route, `/api/v1/**` und Actuator-Probes.
- Dokumentiere lokale Startbefehle für getrennte Frontend-/Backend-Entwicklung sowie den vollständigen Release-Build.

**Akzeptanz:** Ein frischer Checkout kann ohne eingecheckte generierte Quellen den vollständigen Build reproduzieren; das Runtime-Image enthält keine Node-Laufzeit; alle Gates sind grün.

## Empfohlene Ticketreihenfolge

1. CT-01 bis CT-04 und CT-06 beheben.
2. BE-02, BE-03 und BE-04 als öffentliche Readmodelle umsetzen; BE-09 ist Bestandteil von BE-02.
3. BE-06 und BE-10 als fehlende Mutationen umsetzen.
4. CT-05 finalisieren; danach ist der Vertrag bereit für die TypeScript-Clientgenerierung.
5. FE-00 bis FE-02 für Projekt, App Shell und gemeinsame API-/Session-Infrastruktur umsetzen.
6. FE-03 bis FE-07 für Identity, öffentliche Polls, Voting, Results und Audit umsetzen. FE-03 integriert den vorhandenen `POST /identity` aus BE-05.
7. FE-08 bis FE-11 für Administration, Template Catalog, Poll-Lifecycle und Administrative Vote Removal umsetzen.
8. FE-12 als vollständiges Qualitäts-, Docker- und Release-Gate abschließen.

Nicht als Backend-Funktionstickets anlegen: BE-01, BE-05, BE-07, BE-08 und BE-11.

## Build- und Abnahmevorgaben

- Der Frontend-Quellcode entsteht ausschließlich im neuen `justvotes`-Monorepo; der eingebettete Routen- und UX-Vertrag in dieser Datei ist die vollständige Legacy-Referenz.
- Das Frontend liegt als eigenständiges pnpm-Projekt im Monorepo und bleibt unabhängig vom normalen Maven-Backend-Build entwickelbar.
- Das Maven-Release-Profil orchestriert die nicht versionierte Clientgenerierung und den Vite-Build und nimmt die statischen Artefakte in das ausführbare Spring-Boot-JAR auf.
- Das Docker-Multistage-Build verwendet das Release-Profil; das Runtime-Image enthält ausschließlich die JRE, das JAR und keine Node-Laufzeit.
- Die SPA wird unter `/` ausgeliefert; Assets, Router und Cookies müssen keinen konfigurierbaren Basispfad unterstützen.
- Der Spring-SPA-Fallback bedient die erhaltenen Clientrouten, niemals jedoch `/api/**`, `/actuator/**` oder vorhandene statische Dateien.
- WCAG 2.2 AA ist Teil der funktionalen Abnahme.
- Playwright prüft die festgelegten kritischen Nutzerflüsse, Axe die Barrierefreiheit; visuelle Screenshot-Baselines werden nicht verwendet.

## Betrieb und Übergang

- Es gibt keinen Parallelbetrieb, keinen Dual Write und keine Laufzeitkopplung zum Legacy-System.
- Das neue System wird unmittelbar aus dem neuen Monorepo gebaut und betrieben. Das alte Frontend ist nicht Bestandteil des neuen Images.
- Sämtliche Frontend-Ressourcen werden selbst gehostet und im Spring-Boot-Artefakt ausgeliefert.
- Bei einer abgelaufenen Admin-Session werden geschützte Client-Caches verworfen, bevor erneut authentifiziert wird.
- Netzwerkfehler führen zu sichtbaren Fehlerzuständen; gecachte Daten werden nicht stillschweigend als aktuell dargestellt.
- Es werden weder Offlinefähigkeit noch externe Browser-Telemetrie zugesagt.
