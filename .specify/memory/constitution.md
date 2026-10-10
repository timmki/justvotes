<!--
Sync Impact Report
- Version change: unratified scaffold -> 1.0.0
- Modified principles: all five scaffold principles replaced with JustVotes-specific principles
- Added sections: Additional Constraints; Development Workflow
- Removed sections: none
- Deferred TODO: original ratification date is unknown
-->
# JustVotes Constitution

## Core Principles

### I. Hexagonal Domain Core
Das Spring-Boot-Backend MUST seine fachliche Logik in den
frameworkunabhängigen Domänenmodulen `poll-management` und `template-catalog`
halten. Anwendungsfälle werden über In- und Out-Ports definiert; HTTP,
Persistenz, Transaktionen und Scheduling bleiben Adapter beziehungsweise
Bootstrap-Verantwortung. Domänenmodelle MUST ihre Invarianten und
Zustandsübergänge selbst erzwingen. Dadurch bleibt die Fachlogik unabhängig
von Spring und technischen Integrationen testbar.

### II. Contract-First API
Die versionierte OpenAPI-Datei unter
`api-contract/src/main/openapi/justvotes-v1.yaml` MUST der maßgebliche
HTTP-Vertrag sein. API-Änderungen MUST den Vertrag und die daraus generierten
Server- und TypeScript-Quellen berücksichtigen; generierte Quellen dürfen weder
manuell bearbeitet noch committed werden. Bestehende Endpunkte und ihre
semantischen Verträge MUST erhalten bleiben, sofern eine Änderung nicht
ausdrücklich Teil einer Anforderung ist. So bleiben Backend und Frontend
verlässlich gekoppelt.

### III. Explicit Domain Models and Boundaries
Neue Fachregeln MUST als explizite, kleine und typisierte Domänenlogik
modelliert werden, nicht als implizite Controller- oder Persistenzlogik.
Records SHOULD für Value Objects und unveränderliche Daten verwendet werden;
fachliche Aggregate und Entities MUST ihre veränderlichen Zustände kapseln.
Konstruktor-Injektion, `final`-Klassen wo angemessen und explizite Validierung
bleiben der bevorzugte Java-Stil. Technische Details dürfen nicht in den
Domänenkern gelangen, weil dadurch Abhängigkeiten und Testaufwand wachsen.

### IV. Feature-Oriented React Frontend
Das React/Vite-Frontend MUST strict TypeScript verwenden und fachlich nach
Features unter `frontend/src/features` strukturiert sein; gemeinsam genutzte
Infrastruktur und UI gehören unter `frontend/src/shared`. API-Zugriffe MUST
über den zentralen API-Client erfolgen. React Query MUST den Serverzustand,
Caching und dessen Invalidierung verwalten; lokaler UI-Zustand, Projektionen
und Formatierung bleiben davon getrennt. Neue UI wird als funktionale
React-Komponenten mit Hooks und kleinen, expliziten Funktionen umgesetzt.

### V. Testable Changes and Quality Gates
Jede Änderung an Verhalten oder Vertrag MUST durch passende Tests abgesichert
werden: Domänenregeln durch Unit-Tests, Integrationsgrenzen durch
Integrationstests und betroffene Nutzerabläufe durch Frontend- oder
End-to-End-Tests. Tests MUST die öffentliche Wirkung prüfen und dürfen keine
unnötigen Implementierungsdetails festschreiben. Alle bestehenden Backend-, Frontend-,
Vertrags-, Browser- und Containerprüfungen der CI MUST erfolgreich bleiben,
bevor eine Änderung als abgeschlossen gilt.

## Additional Constraints

Das Backend verwendet Java 21 und Spring Boot; das Frontend verwendet React,
Vite und TypeScript. Schemaänderungen MUST ausschließlich als validierte
Flyway-Migrationen erfolgen; Hibernate darf das Schema nicht automatisch
ändern. Die bestehende serverseitige Administratorsitzung mit Cookies und
CSRF-Schutz MUST beibehalten und darf nicht durch unsichere clientseitige
Authentifizierungsmechanismen ersetzt oder abgeschwächt werden.

Das Frontend MUST semantisches HTML, zugängliche Formulare, sichtbare
Fokuszustände, Tastaturbedienung und geeignete ARIA- beziehungsweise
Live-Regionen erhalten. Layouts MUST auf kleinen und großen Bildschirmen
funktionieren. Sichtbare Texte und Fehlermeldungen MUST über die vorhandenen
Internationalisierungsressourcen gepflegt werden. Fachliche Begriffe MUST der
Terminologie in `CONTEXT.md` entsprechen; insbesondere sind dort vermiedene
Synonyme nicht erneut einzuführen.

## Development Workflow

Änderungen MUST zuerst innerhalb der betroffenen Domänen- und
Vertragsgrenzen eingeordnet werden und dürfen keine unnötigen Abstraktionen
oder neuen Abhängigkeiten einführen. Bei Backend- und API-Änderungen sind
OpenAPI-Vertrag, generierte Quellen, Adapter und Frontend-Auswirkungen zu
prüfen. Bei Frontend-Änderungen sind Serverzustand, Fehler- und Ladezustände,
Internationalisierung, Barrierefreiheit und responsive Darstellung zu prüfen.

Vor dem Abschluss sind mindestens die relevanten etablierten Prüfungen
auszuführen. Der Backend-Basissatz ist
`mvn -s .mvn/settings.xml test`; für das Frontend gelten `pnpm build`,
`pnpm typecheck`, `pnpm lint`, `pnpm test` und `pnpm test:e2e` aus
`frontend/`. Änderungen an generierten Artefakten werden durch die jeweiligen
Generatoren reproduziert und nicht direkt korrigiert.

## Governance

Diese Constitution definiert die verbindlichen Architektur-, Coding- und
Qualitätsgrenzen für neue Änderungen und ergänzt, aber ersetzt nicht, den
fachlichen Vertrag in `CONTEXT.md` oder den versionierten OpenAPI-Vertrag.
Bei widersprüchlichen Vorschlägen MUSS der Konflikt vor der Implementierung
geklärt und dokumentiert werden.

Änderungen an dieser Constitution benötigen eine nachvollziehbare Begründung,
eine Aktualisierung des Sync Impact Reports und eine semantische
Versionsänderung. Ein MAJOR-Bump ist für inkompatible Entfernung oder
Neudefinition verbindlicher Regeln erforderlich, ein MINOR-Bump für neue oder
wesentlich erweiterte Regeln und ein PATCH-Bump für rein redaktionelle
Klarstellungen. Reviews MÜSSEN die betroffenen Prinzipien und die passenden
Qualitätsprüfungen berücksichtigen. Abweichungen sind nur zulässig, wenn sie
im Änderungsumfang begründet und im Review ausdrücklich festgehalten werden.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): ursprüngliches Ratifikationsdatum unbekannt | **Last Amended**: 2026-09-15
