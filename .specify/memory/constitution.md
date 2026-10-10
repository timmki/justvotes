# JustVotes Constitution

## Core Principles

### I. Hexagonal Domain Core
Das Backend MUST fachliche Logik in frameworkunabhängigen Domänenmodulen
halten. Anwendungsfälle werden über In- und Out-Ports definiert; HTTP,
Persistenz, Transaktionen und Scheduling bleiben Adapter- beziehungsweise
Bootstrap-Verantwortung. Domänenmodelle MUST ihre Invarianten und
Zustandsübergänge selbst erzwingen. Die konkrete Modulzuordnung und ihre
Abhängigkeiten sind im [Architekturleitfaden](../../docs/development/architecture.md)
dokumentiert.
Dadurch bleibt die Fachlogik unabhängig von technischen Integrationen
testbar, ohne die heutige Modulaufteilung als abschließende Liste festzuschreiben.

### II. Contract-First API
Die versionierte OpenAPI-Datei
[`api-contract/src/main/openapi/justvotes-v1.yaml`](../../api-contract/src/main/openapi/justvotes-v1.yaml) MUST der maßgebliche
HTTP-Vertrag sein. API-Änderungen MUST den Vertrag und die daraus generierten
Server- und TypeScript-Quellen berücksichtigen; generierte Quellen dürfen weder
manuell bearbeitet noch committed werden. Bestehende Endpunkte und ihre
semantischen Verträge MUST erhalten bleiben, sofern eine Änderung nicht
ausdrücklich Teil einer Anforderung ist. So bleiben Backend und Frontend
verlässlich gekoppelt.

### III. Explicit Domain Models and Boundaries
Neue Fachregeln MUST als explizite, kleine und typisierte Domänenlogik
modelliert werden, nicht als implizite Controller- oder Persistenzlogik.
Fachliche Aggregate und Entities MUST ihre veränderlichen Zustände kapseln.
Technische Details dürfen nicht in den Domänenkern gelangen, weil dadurch
Abhängigkeiten und Testaufwand wachsen. Sprach- und Frameworkkonventionen
sind im [Java-Entwicklungsleitfaden](../../docs/development/java.md) verbindlich
festgehalten.

### IV. Feature-Oriented React Frontend
Das Frontend MUST typsicher und fachlich nach Features modularisiert sein.
Zugriff auf Serverzustand und lokaler UI-Zustand MUST klar getrennt bleiben.
Die verbindlichen TypeScript-, Verzeichnis-, API-Client- und React-Query-
Konventionen sind im [Frontend-Entwicklungsleitfaden](../../docs/development/frontend.md)
dokumentiert.

### V. Testable Changes and Quality Gates
Jede Änderung an Verhalten oder Vertrag MUST durch passende Tests abgesichert
werden: Domänenregeln durch Unit-Tests, Integrationsgrenzen durch
Integrationstests und betroffene Nutzerabläufe durch Frontend- oder
End-to-End-Tests. Tests MUST die öffentliche Wirkung prüfen und dürfen keine
unnötigen Implementierungsdetails festschreiben. Alle verpflichtenden
Backend-, Frontend-, Vertrags-, Browser- und Containerprüfungen der CI MUST
erfolgreich bleiben, bevor eine Änderung als abgeschlossen gilt.

## Additional Constraints

Schemaänderungen MUST ausschließlich als validierte Flyway-Migrationen
erfolgen; Hibernate darf das Schema nicht automatisch ändern. Die bestehende
serverseitige Administratorsitzung mit Cookies und CSRF-Schutz MUST
beibehalten und darf nicht durch unsichere clientseitige
Authentifizierungsmechanismen ersetzt oder abgeschwächt werden.

Das Frontend MUST semantisches HTML, zugängliche Formulare, sichtbare
Fokuszustände, Tastaturbedienung und geeignete ARIA- beziehungsweise
Live-Regionen erhalten. Layouts MUST auf kleinen und großen Bildschirmen
funktionieren. Sichtbare Texte und Fehlermeldungen MUST über die vorhandenen
Internationalisierungsressourcen gepflegt werden. Fachliche Begriffe MUST der
Terminologie in [`CONTEXT.md`](../../CONTEXT.md) entsprechen; insbesondere sind dort vermiedene
Synonyme nicht erneut einzuführen.

## Development Workflow

Änderungen MUST zuerst innerhalb der betroffenen Domänen- und
Vertragsgrenzen eingeordnet werden und dürfen keine unnötigen Abstraktionen
oder neuen Abhängigkeiten einführen. Bei Backend- und API-Änderungen sind
OpenAPI-Vertrag, generierte Quellen, Adapter und Frontend-Auswirkungen zu
prüfen. Bei Frontend-Änderungen sind Serverzustand, Fehler- und Ladezustände,
Internationalisierung, Barrierefreiheit und responsive Darstellung zu prüfen.

Die konkreten Voraussetzungen sowie ausführbaren Build- und Testbefehle sind
im [README](../../README.md) dokumentiert und werden dort gepflegt. Vor dem Abschluss sind
die relevanten etablierten Prüfungen auszuführen; alle verpflichtenden CI-
Prüfungen MUST erfolgreich sein. Änderungen an generierten Artefakten werden
durch die jeweiligen Generatoren reproduziert und nicht direkt korrigiert.

## Governance

Diese Constitution definiert die verbindlichen Architektur-, Coding- und
Qualitätsgrenzen für neue Änderungen und ergänzt, aber ersetzt nicht, den
fachlichen Vertrag in [`CONTEXT.md`](../../CONTEXT.md) oder den versionierten
[OpenAPI-Vertrag](../../api-contract/src/main/openapi/justvotes-v1.yaml).
Bei widersprüchlichen Vorschlägen MUSS der Konflikt vor der Implementierung
geklärt und dokumentiert werden.

Der alleinige Entwickler pflegt diese Constitution. Änderungen erhalten eine
nachvollziehbare Begründung und eine semantische Versionsänderung: MAJOR für
inkompatible Entfernung oder Neudefinition verbindlicher Regeln, MINOR für
neue oder wesentlich erweiterte Regeln und PATCH für redaktionelle
Klarstellungen. Der Entwickler prüft bei Planung und Abschluss die betroffenen
Prinzipien und Qualitätsprüfungen. Abweichungen sind nur zulässig, wenn sie im
Änderungsumfang begründet und bei dieser Prüfung ausdrücklich festgehalten
werden. Die Constitution ergänzt, aber ersetzt nicht [`CONTEXT.md`](../../CONTEXT.md)
als fachliche Quelle oder den versionierten
[OpenAPI-Vertrag](../../api-contract/src/main/openapi/justvotes-v1.yaml) als HTTP-Vertrag.

**Version**: 2.0.0 | **Ratified**: TODO(RATIFICATION_DATE): ursprüngliches Ratifikationsdatum unbekannt | **Last Amended**: 2026-10-10
