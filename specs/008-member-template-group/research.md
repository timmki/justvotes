# Research: Mitgliedergruppe

## R1 – Ausnahme vom unveränderlichen Poll-Snapshot

- **Decision**: Polls aus der Mitgliedergruppe erhalten beim Anlegen das Merkmal `followsMembers = true`, abgeleitet aus dem Gruppensnapshot. Nur solche Polls dürfen nachträglich Optionen erhalten.
  - In `draft` und `active` hängt `Poll.addMemberOption` die neue Option an `options` und an `templateSnapshotOptions` an.
  - Alle anderen Zustände und Polls lehnen das ab.
- **Rationale**:
  - Das Merkmal ist am Poll gespeichert und hängt nicht von einer Live-Referenz auf den Katalog ab. Der Poll bleibt so selbsttragend.
  - Ein späteres Umbenennen oder Entfernen im Katalog kann alte Polls nicht verändern.
- **Alternatives considered**:
  - Optionen live aus dem Katalog lesen. Verworfen, weil das alle Polls an den Katalog koppelt.
  - Die Gruppen-ID bei jedem Ereignis vergleichen. Verworfen, weil es bricht, falls die Gruppe neu angelegt wird.

## R2 – Stabilität von Optionen und Stimmen

- **Decision**: Neue Optionen werden mit der Nummer `max + 1` angehängt, ohne alphabetische Neusortierung. Bestehende Optionszeilen werden nie ersetzt.
- **Rationale**: Stimmen referenzieren `Option.id` mit `ON DELETE CASCADE`. Eine Neuanlage der Optionsliste (wie `replaceOptions`) würde Stimmen löschen (FR-008, SC-003).
- **Alternatives considered**: Neu sortieren und neu nummerieren. Verworfen, weil es Stimmen gefährdet und Optionen beim Abstimmen springen lässt.

## R3 – Kopplung der Module

- **Decision**: Die Module werden synchron in der Annahme-Transaktion gekoppelt.
  - `InvitationManagement.accept` ruft nach dem Speichern den Ausgangsport `MemberJoinedListener.memberJoined(identity)` auf.
  - In `adapters` implementiert `MemberJoinedFanOut` diesen Port und ruft nacheinander `SyncMemberTemplates` (Katalog) und `ExtendMemberPolls` (Polls) auf.
- **Rationale**:
  - Es gibt keine Infrastruktur für Nachrichten oder asynchrone Verarbeitung.
  - Die synchrone Kopplung ist atomar: Schlägt sie fehl, entsteht auch kein Konto. Damit gibt es keinen Drift (SC-001), und die 5 s aus SC-002 sind trivial erfüllt.
  - Die Domänenmodule kennen sich weiterhin nicht.
- **Alternatives considered**:
  - Spring-Application-Events nach dem Commit. Verworfen, weil Drift bei Fehlern möglich ist.
  - Ein periodischer Abgleich. Er dient nur als Reserve und ist nicht Teil des Features.

## R4 – Anlage und Backfill

- **Decision**: Die Migration V9 legt Folgendes an:
  - Spalte `OptionTemplateGroup.kind` (`MANUAL` | `MEMBERS`) mit partiellem Unique-Index auf `MEMBERS`
  - Spalte `OptionTemplate.memberIdentityKey`, nullable und unique
  - Spalte `Poll.followsMembers`
  - die Gruppe „Alle Mitglieder“ samt Mitgliedschaften für alle Konten mit `role = 'USER'`
- **Rationale**:
  - FR-001 verlangt „immer“, also auch in einer frischen Instanz.
  - Die Migration ist der einzige zugelassene Weg für Schemaänderungen.
  - Bestehende Polls bleiben `followsMembers = 0`, weil vor dem Feature keine Mitgliedergruppe existierte.
- **Alternatives considered**: Anlage beim Start der Anwendung. Verworfen, weil das Schema dann nicht allein die Invariante trägt.

## R5 – Namenskonflikte

- **Decision**:
  - **Gruppe:** Eine bestehende manuelle Gruppe namens „Alle Mitglieder“ benennt die Migration in „Alle Mitglieder (manuell)“ um.
  - **Vorlagen:** Existiert eine manuelle Optionsvorlage mit dem Namen einer Identität (ohne Groß- und Kleinschreibung), wird sie übernommen. Sie erhält `memberIdentityKey`, wird damit verwaltet und behält ihre anderen Gruppenzuordnungen.
  - **Neue manuelle Vorlagen:** Wer eine manuelle Vorlage mit dem Namen einer bestehenden Identität anlegen will, bekommt wie bisher „Name existiert bereits“.
- **Rationale**: `name` ist unique. Das Anlegen eines Kontos darf nie an einem Katalognamen scheitern (Edge Case der Spec).

## R6 – Gesperrte und entfernte Konten (User Story 3)

- **Decision**:
  - **Gesperrte Konten** (`LOCKED`) bleiben Mitglieder, denn ihre Identität besteht fort.
  - **Entfernte Konten:** Die Codebasis bietet heute kein Löschen von Konten (`ManageAccounts` kennt nur lock, unlock und Einmalpasswort). FR-009 hat daher keinen Auslöser.
  - Die Domänenregel `Poll.removeMemberOption` (nur ohne Stimmen) wird nicht gebaut. Sie wird erst mit einem künftigen Feature zum Löschen von Konten umgesetzt.
- **Rationale**: Kein toter Code ohne Aufrufer. Die Spec-Annahme „Entfernen ist selten“ trifft sogar verschärft zu.
- **Status**: In der Spec als zurückgestellt eingetragen.

## R8 – Leere Gruppe, manuell geänderte Entwürfe, fällige Polls

- **Decision**:
  - Ein Poll aus der leeren Mitgliedergruppe wird wie bei jeder leeren Gruppe mit 400 abgelehnt (bestehende Regel „mindestens eine Option“).
  - `replaceOptions` bleibt für mitlaufende Entwürfe erlaubt; `addMemberOption` hängt nur die neue Identität an.
  - Ist das Ende eines aktiven Polls bereits erreicht, wird er nicht ergänzt, auch wenn er noch nicht als abgelaufen markiert ist.
- **Rationale**: Bestehende Regeln wiederverwenden; das Ergebnis eines abgelaufenen Polls bleibt unabhängig vom Zeitpunkt der Ablaufprüfung stabil.

## R7 – Darstellung und Schutz im Katalog

- **Decision**: Die API liefert `TemplateGroup.kind` und `Template.managed`.
  - Verwaltete Elemente lehnt `ManageTemplateCatalog` mit `CatalogItemManagedException` ab, HTTP 409 mit Code `catalog-item-managed`.
  - Das Frontend zeigt ein Badge „Automatisch“ und blendet die Aktionen zum Bearbeiten aus.
  - Der Name wird gespeichert als „Alle Mitglieder“. Das Frontend übersetzt ihn für `kind = MEMBERS` über einen i18n-Schlüssel.
- **Rationale**: FR-004 und FR-012. Die Server-Prüfung ist maßgeblich, die UI zeigt sie nur an.
