# Feature Specification: Personal Profile

**Feature Branch**: `001-personal-profile`

**Created**: 2026-09-15

**Status**: Draft

**Input**: User description: "Create a personal profile page showing the current information about polls and votes of my currently assigned userid in my session."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Eigene Abstimmungsübersicht ansehen (Priority: P1)

Eine Person mit zugewiesener Identität öffnet die persönliche Profilseite und
sieht die aktuell zugewiesene Identität sowie die öffentlich lesbaren
Abstimmungen, in denen diese Identität eine aktuelle Stimme hat. Zu jeder
Abstimmung werden der Titel, der aktuelle Lebenszyklus, die gewählte Option und
der Zeitpunkt der Stimmabgabe angezeigt.

**Why this priority**: Die Person erhält an einer Stelle verlässliche
Transparenz über ihre aktuellen Stimmen, ohne einzelne Abstimmungen durchsuchen
zu müssen.

**Independent Test**: Mit einer gesetzten Identität und mindestens zwei
aktuellen Stimmen kann die Profilseite geöffnet und mit den zugehörigen
Abstimmungen und Optionen abgeglichen werden.

**Acceptance Scenarios**:

1. **Given** eine gesetzte Identität mit aktuellen Stimmen in mehreren
   öffentlich lesbaren Abstimmungen, **When** die Profilseite geöffnet wird,
   **Then** werden nur diese Abstimmungen mit jeweils der aktuellen Stimme
   angezeigt.
2. **Given** eine angezeigte Abstimmung, **When** die Person den Eintrag
   betrachtet, **Then** sieht sie Titel, Lebenszyklus, gewählte Option und
   Stimmabgabezeitpunkt.
3. **Given** eine Abstimmung ist nicht mehr öffentlich lesbar, **When** die
   Profilseite geladen wird, **Then** erscheint diese Abstimmung nicht in der
   persönlichen Übersicht.

---

### User Story 2 - Fehlende Identität verstehen und setzen (Priority: P2)

Eine Person ohne zugewiesene Identität öffnet die Profilseite und erhält einen
verständlichen Leerzustand. Dieser erklärt, dass zunächst eine Identität
gesetzt werden muss, und bietet den bestehenden Weg zum Setzen oder Ändern der
Identität an.

Eine gesetzte Identität ohne passende aktuelle Stimme erhält stattdessen einen
eigenen Leerzustand, der erklärt, dass derzeit keine eigene Stimme in einer
öffentlich lesbaren Abstimmung vorhanden ist.

**Why this priority**: Die Profilseite bleibt auch bei einer neuen oder
gelöschten Browserzuordnung verständlich und führt ohne Fehlermeldung zum
nächsten sinnvollen Schritt.

**Independent Test**: Mit fehlender Identität sowie mit einer gesetzten
Identität ohne aktuelle öffentliche Stimme kann die Profilseite geöffnet werden;
beide Leerzustände sind unterscheidbar, enthalten keine fremden Daten und der
bestehende Identitätsdialog ist im ersten Fall erreichbar.

**Acceptance Scenarios**:

1. **Given** keine Identität ist zugewiesen, **When** die Profilseite geöffnet
   wird, **Then** wird keine Abstimmung und keine Stimme einer anderen
   Identität angezeigt.
2. **Given** der Leerzustand wird angezeigt, **When** die Person die angebotene
   Aktion auswählt, **Then** kann sie eine Identität setzen und anschließend
   ihre persönliche Übersicht laden.
3. **Given** eine Identität ist gesetzt, aber hat keine passende aktuelle
   Stimme, **When** die Profilseite geöffnet wird, **Then** wird der Zustand
   „keine aktuelle Stimme“ angezeigt und es werden keine fremden Daten gezeigt.

---

### User Story 3 - Übersicht nach eigener Änderung aktualisieren (Priority: P3)

Eine Person sieht nach einer Stimmabgabe, dem Ersetzen oder dem Zurücknehmen
einer Stimme sowie nach einer Identitätsänderung eine konsistente persönliche
Übersicht.

**Why this priority**: Die Profilseite darf keine veralteten oder einer
früheren Identität zugeordneten Informationen anzeigen.

**Independent Test**: Eine Stimme wird geändert oder zurückgenommen; danach
wird die Profilseite geöffnet und geprüft, ob die Übersicht den aktuellen
Stand widerspiegelt.

**Acceptance Scenarios**:

1. **Given** eine Abstimmung ist in der Übersicht enthalten, **When** die
   aktuelle Stimme zurückgenommen wird, **Then** verschwindet die Abstimmung
   aus der Übersicht, sofern keine andere aktuelle Stimme dieser Identität
   vorhanden ist.
2. **Given** eine Stimme wird durch eine andere Option ersetzt, **When** die
   Profilseite erneut geladen wird, **Then** zeigt der Eintrag ausschließlich
   die neue Option und ihren neuen Stimmabgabezeitpunkt.
3. **Given** die Identität wird geändert, **When** die Profilseite erneut
   geladen wird, **Then** zeigt sie ausschließlich Informationen der neuen
   Identität.

### Edge Cases

- Die Identität ist gesetzt, hat aber keine aktuelle Stimme in einer öffentlich
  lesbaren Abstimmung.
- Eine Abstimmung läuft während des Ladens ab und ist danach nicht mehr
  öffentlich aktiv, aber weiterhin lesbar.
- Die gespeicherte Identität ist ungültig oder nicht mehr lesbar; die Anfrage
  verhält sich wie ohne Identität, liefert den Identitäts-Leerzustand und keine
  fremden Daten.
- Die persönliche Übersicht kann wegen eines vorübergehenden Netz- oder
  Serverfehlers nicht geladen werden; die Person erhält eine verständliche
  Fehlermeldung und kann erneut laden.
- Eine öffentlich lesbare Abstimmung enthält mehrere Optionen, aber die
  aktuelle Stimme verweist auf keine davon; der Eintrag wird nicht mit einer
  falschen Option dargestellt.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Das System MUST eine persönliche Profilseite bereitstellen, die
  ohne Administratorsitzung erreichbar ist.
- **FR-002**: Die Profilseite MUST ausschließlich die aktuell zugewiesene
  Identität der anfragenden Person verwenden und darf keine frei wählbare
  Identität als Abfrageparameter akzeptieren.
- **FR-003**: Die Profilseite MUST die aktuell zugewiesene Identität anzeigen,
  wenn eine solche vorhanden ist.
- **FR-004**: Das System MUST nur öffentlich lesbare Abstimmungen anzeigen, in
  denen die aktuelle Identität eine aktuelle Stimme hat. Öffentlich lesbar
  bedeutet für diese Funktion `public` mit dem Poll-Lebenszyklus `active`,
  `expired` oder `archived`; `draft` und `deleted` sind ausgeschlossen.
- **FR-005**: Jeder angezeigte Abstimmungseintrag MUST mindestens Titel,
  Poll-Lebenszyklus, gewählte Option und Stimmabgabezeitpunkt enthalten.
- **FR-006**: Die Profilseite MUST bei fehlender Identität einen
  Identitäts-Leerzustand und bei gesetzter Identität ohne passende aktuelle
  Stimme einen davon unterscheidbaren Keine-Stimme-Leerzustand anzeigen.
- **FR-007**: Bei fehlender Identität MUST die Profilseite den bestehenden Weg
  zum Setzen oder Ändern der Identität anbieten.
- **FR-008**: Nach einer Stimmabgabe, einem Ersetzen, Zurücknehmen oder einer
  Identitätsänderung MUST der nächste Abruf der Profilseite, einschließlich
  Navigation, vollständigem Reload oder einem durch die bestehende UI
  ausgelösten Neuladen, ausschließlich den aktuellen Stand anzeigen.
- **FR-009**: Lade-, Fehler- und Leerzustände MUST verständlich dargestellt
  werden und dürfen keine Daten einer anderen Identität offenlegen.
- **FR-010**: Die Profilseite MUST die bestehende Barrierefreiheit,
  Internationalisierung und responsive Darstellung der Anwendung einhalten.
- **FR-011**: Die persönliche Übersicht MUST gegen Speicherung durch Browser
  und Zwischen-Caches geschützt sein.

### Key Entities *(include if feature involves data)*

- **Identität**: Global gültige, frei gewählte `userID`, die eine Person für
  fachliche Zwecke repräsentiert und der aktuellen Anfrage zugeordnet ist.
- **Poll**: Öffentlich lesbare Abstimmung mit Titel, Lebenszyklus und Optionen,
  die in der persönlichen Übersicht erscheinen kann.
- **Stimme**: Die aktuelle Wahl genau einer Option einer Identität in einem
  Poll; sie ist die Grundlage für den jeweiligen persönlichen Eintrag. Für
  jede Kombination aus Identität und Poll gibt es höchstens eine aktuelle
  Stimme; Ersetzen aktualisiert Option und Zeitpunkt, Zurücknehmen entfernt sie.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Eine Person mit gesetzter Identität kann die persönliche Übersicht
  innerhalb eines Navigationsschritts öffnen und alle aktuellen eigenen
  Stimmen in öffentlich lesbaren Abstimmungen erkennen.
- **SC-002**: In 100 % der geprüften Profilansichten werden ausschließlich
  Abstimmungen und Stimmen der aktuell zugewiesenen Identität angezeigt.
- **SC-003**: In 100 % der geprüften Fälle mit fehlender Identität wird der
  Identitäts-Leerzustand und in 100 % der geprüften Fälle ohne aktuelle Stimme
  der davon unterscheidbare Keine-Stimme-Leerzustand angezeigt.
- **SC-004**: Die persönliche Übersicht bleibt auf den unterstützten kleinen
  und großen Bildschirmgrößen vollständig bedienbar und für Tastatur- sowie
  assistive-Technologie-Nutzung zugänglich.
- **SC-005**: Bei jeder geprüften Navigation zur persönlichen Übersicht werden
  die vollständigen persönlichen Einträge in einem Ladevorgang bereitgestellt;
  zusätzliche Ladevorgänge pro Poll werden nicht ausgeführt.

## Assumptions

- Die Formulierung "currently assigned userid" bezeichnet die bestehende
  aktuelle Identität der Person, nicht ein Administratorkonto.
- Die erste Version zeigt aktuelle Stimmen, nicht die vollständige
  Domänenereignis- oder Abstimmungshistorie einer Identität.
- Nicht öffentlich lesbare oder gelöschte Abstimmungen werden nicht in der
  persönlichen Übersicht angezeigt.
- Das bestehende Setzen und Ändern der Identität bleibt unverändert und wird
  von der Profilseite wiederverwendet.
- Die persönliche Profilseite benötigt keine zusätzliche Anmeldung und darf
  keine fremde Identität durch direkte Eingabe oder eine alternative URL
  abrufbar machen.
