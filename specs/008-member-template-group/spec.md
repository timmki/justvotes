# Feature Specification: Mitgliedergruppe

**Feature Branch**: `008-member-template-group`

**Created**: 2026-11-01

**Status**: Draft

**Input**: User description: "Es soll für alle angemeldeten Mitglieder immer eine automatische Vorlagengruppe existieren, die sich auch automatisch aktualisiert. Wenn es bereits Abstimmungen mit dieser Gruppe gibt, sollten die Optionen sich automatisch auch aktualisieren, wenn neue Mitglieder dazu kommen."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Poll über alle Mitglieder anlegen (Priority: P1)

Wer einen Poll anlegt, findet im Vorlagenkatalog stets die Mitgliedergruppe, eine automatisch gepflegte Vorlagengruppe mit dem Namen „Alle Mitglieder“. Sie enthält für jedes User-Konto genau eine Optionsvorlage mit dessen Identität. Niemand muss die Gruppe pflegen.

**Why this priority**: Abstimmungen über Personen (z. B. „Wer übernimmt den Dienst?“) sind der Kernnutzen; ohne die Gruppe gibt es nichts zu aktualisieren.

**Independent Test**: Drei User-Konten anlegen, Poll aus „Alle Mitglieder“ erzeugen und prüfen, dass genau drei Optionen mit den drei Identitäten entstehen.

**Acceptance Scenarios**:

1. **Given** eine Instanz mit User-Konten, **When** ein User den Vorlagenkatalog öffnet, **Then** ist „Alle Mitglieder“ mit je einer Optionsvorlage pro Identität vorhanden.
2. **Given** eine frische Instanz ohne User-Konten, **When** der Katalog geöffnet wird, **Then** existiert die Gruppe trotzdem und ist leer.
3. **Given** eine leere Mitgliedergruppe, **When** ein Poll aus ihr angelegt werden soll, **Then** wird das wie bei jeder leeren Vorlagengruppe mit einer verständlichen Meldung abgelehnt, weil ein Poll mindestens eine Option braucht.
4. **Given** die Mitgliedergruppe, **When** wer den Katalog bearbeiten darf versucht, sie umzubenennen, zu löschen oder ihre Mitgliedschaften manuell zu ändern, **Then** wird das abgelehnt und erklärt, dass die Gruppe automatisch gepflegt wird.

---

### User Story 2 - Neue Mitglieder erscheinen automatisch (Priority: P1)

Nimmt jemand eine Einladung an und legt dadurch ein User-Konto an, erscheint seine Identität sofort als Optionsvorlage in der Gruppe und als neue Option in allen bestehenden Polls dieser Gruppe, in denen noch abgestimmt werden kann.

**Why this priority**: Das ist der ausdrückliche Wunsch: bestehende Abstimmungen sollen neue Mitglieder enthalten.

**Independent Test**: Poll aus „Alle Mitglieder“ veröffentlichen, eine Einladung annehmen lassen, den Poll neu laden. Die neue Option ist da, und bestehende Stimmen sind unverändert.

**Acceptance Scenarios**:

1. **Given** ein aktiver Poll aus „Alle Mitglieder“ mit abgegebenen Stimmen, **When** ein neues User-Konto entsteht, **Then** enthält der Poll eine zusätzliche Option für die neue Identität, und alle bisherigen Stimmen bleiben erhalten.
2. **Given** ein Entwurf aus „Alle Mitglieder“, **When** ein neues Mitglied hinzukommt, **Then** enthält auch der Entwurf die neue Option.
3. **Given** ein abgelaufener oder archivierter Poll aus der Gruppe, **When** ein neues Mitglied hinzukommt, **Then** bleiben seine Optionen unverändert.
4. **Given** ein Poll aus einer manuell gepflegten Vorlagengruppe, **When** ein neues Mitglied hinzukommt, **Then** ändert sich der Poll nicht (Poll-Snapshot bleibt unveränderlich).
5. **Given** ein mitlaufender Entwurf, dessen Optionen manuell geändert wurden, **When** ein neues Mitglied hinzukommt, **Then** wird nur dessen Option angehängt; manuell entfernte Identitäten werden nicht wieder ergänzt.
6. **Given** ein Poll wurde um eine Option ergänzt, **When** das Prüfprotokoll geöffnet wird, **Then** ist die automatische Ergänzung als Domänenereignis nachvollziehbar.

---

### User Story 3 - Ausscheidende Mitglieder (Priority: P3, zurückgestellt)

> **Zurückgestellt**: Konten lassen sich derzeit nur sperren, nicht löschen. Gesperrte Konten bleiben Mitglieder. Diese Story wird mit einem künftigen Feature zum Löschen von Konten umgesetzt.

Wird ein User-Konto entfernt, verschwindet seine Optionsvorlage aus der Gruppe. In draft- und active-Polls wird seine Option nur dann entfernt, wenn sie keine Stimmen hat; sonst bleibt sie erhalten, damit keine Stimme verloren geht.

**Why this priority**: Konten werden selten entfernt. Wichtig ist nur, dass keine abgegebene Stimme verloren geht.

**Independent Test**: Ein Konto ohne Stimmen und eins mit Stimmen entfernen. Die erste Option verschwindet, die zweite bleibt.

**Acceptance Scenarios**:

1. **Given** ein aktiver Poll, in dem die Option eines Mitglieds keine Stimmen hat, **When** dessen Konto entfernt wird, **Then** verschwindet die Option.
2. **Given** eine Option mit mindestens einer Stimme, **When** das zugehörige Konto entfernt wird, **Then** bleibt die Option samt Stimmen erhalten.

### Edge Cases

- Zwei Konten entstehen gleichzeitig: Beide erscheinen genau einmal, ohne doppelte Optionen.
- Eine manuell angelegte Gruppe oder Optionsvorlage heißt bereits „Alle Mitglieder“ bzw. wie eine Identität: Die Mitgliedergruppe bleibt eindeutig unterscheidbar, und es kommt zu keinem Namenskonflikt, der das Anlegen eines Kontos verhindert.
- Ein Poll läuft gerade ab, während ein Mitglied hinzukommt: Ein Poll, dessen Ende zum Zeitpunkt der Ergänzung bereits erreicht ist, gilt als abgelaufen und wird nicht ergänzt, auch wenn sein Zustand noch nicht umgestellt wurde. Die Ergänzung ist atomar.
- Das Administratorkonto besitzt keine Identität und erscheint nie in der Gruppe.
- Ein offener Stimmzettel eines Users wurde vor dem Erscheinen der neuen Option geladen: Bereits abgegebene oder abgegebene Stimmen bleiben gültig, und die neue Option erscheint beim nächsten Laden.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Das System MUST zu jedem Zeitpunkt genau eine automatische Vorlagengruppe „Alle Mitglieder“ bereitstellen, auch in einer Instanz ohne User-Konten.
- **FR-002**: Die Gruppe MUST für jedes bestehende User-Konto genau eine Optionsvorlage mit dessen Identität als Namen enthalten, und für sonst niemanden.
- **FR-003**: Das System MUST die Gruppe ohne menschliches Zutun aktualisieren, sobald ein User-Konto entsteht oder entfernt wird.
- **FR-004**: Das System MUST manuelles Umbenennen, Löschen und Ändern der Mitgliedschaften der Mitgliedergruppe und ihrer Optionsvorlagen ablehnen.
- **FR-005**: Polls MUST weiterhin aus „Alle Mitglieder“ wie aus jeder anderen Vorlagengruppe angelegt werden können.
- **FR-006**: Entsteht ein User-Konto, MUST das System jedem Poll aus „Alle Mitglieder“ im Zustand `draft` oder `active` eine Option für die neue Identität hinzufügen.
- **FR-007**: Polls im Zustand `expired`, `archived` oder `deleted` und Polls aus anderen Vorlagengruppen MUST unverändert bleiben.
- **FR-008**: Das automatische Ergänzen oder Entfernen von Optionen MUST bestehende Stimmen unverändert lassen.
- **FR-009** *(zurückgestellt, siehe User Story 3)*: Wird ein User-Konto entfernt, MUST das System dessen Option in `draft`- und `active`-Polls der Gruppe nur dann entfernen, wenn sie keine Stimmen hat.
- **FR-010**: Jede automatische Änderung der Optionen eines Polls MUST als Domänenereignis im Prüfprotokoll des Polls erscheinen.
- **FR-011**: Ein Poll MUST jede Identität höchstens einmal als Option enthalten, auch bei gleichzeitig entstehenden Konten.
- **FR-012**: Die Mitgliedergruppe MUST im Katalog als automatisch gepflegt erkennbar sein.
- **FR-013**: Neue Mitglieds-Optionen MUST am Ende der Optionsliste angehängt werden; bestehende Optionen behalten Reihenfolge und Nummer.
- **FR-014**: Die Optionen eines mitlaufenden Entwurfs MUST weiterhin manuell änderbar sein; die automatische Pflege ergänzt nur neu hinzukommende Mitglieder.

### Key Entities

- **Mitgliedergruppe**: Eine Vorlagengruppe mit festem Namen „Alle Mitglieder“, deren Mitgliedschaften das System aus der Menge der User-Konten ableitet und nicht manuell bearbeitet werden können.
- **Mitglieds-Optionsvorlage**: Eine Optionsvorlage, die genau einer Identität entspricht. Sie entsteht und verschwindet mit dem User-Konto.
- **Mitlaufender Poll**: Ein Poll aus der Mitgliedergruppe. Solange er im Zustand `draft` oder `active` ist, folgen seine Optionen der Gruppe. Das ist eine bewusste Ausnahme vom unveränderlichen Poll-Snapshot.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100 % der geprüften Zustände entspricht die Gruppe genau der Menge der bestehenden Identitäten.
- **SC-002**: Spätestens 5 Sekunden nach Annahme einer Einladung ist die neue Option in allen `draft`- und `active`-Polls der Gruppe sichtbar.
- **SC-003**: Durch automatische Ergänzungen oder Entfernungen geht keine einzige abgegebene Stimme verloren.
- **SC-004**: Polls aus anderen Gruppen und abgeschlossene Polls ändern sich in 0 Fällen.
- **SC-005**: Ein Poll über alle Mitglieder lässt sich ohne jede Gruppenpflege in unter 1 Minute anlegen.

## Assumptions

- „Angemeldete Mitglieder“ sind alle bestehenden User-Konten, also Konten mit Identität. Gemeint ist nicht, wer gerade eingeloggt ist.
- Der Optionsname ist die Identität (`userID`), weil sie fest und instanzweit eindeutig ist.
- Mitlaufend sind nur Polls in `draft` und `active`. Abgeschlossene Polls behalten ihren Stand, damit Ergebnisse stabil bleiben.
- Der Gruppenname „Alle Mitglieder“ ist fest. Eine Übersetzung der Anzeige ist zulässig.
- Bestehende User-Konten werden bei Einführung des Features einmalig übernommen.
- Konten können derzeit nicht gelöscht werden; gesperrte Konten bleiben Mitglieder. User Story 3 und FR-009 sind deshalb zurückgestellt.
- SC-005 wird manuell bestätigt.
- Benachrichtigungen an Abstimmende über neue Optionen sind nicht Teil dieses Features.
