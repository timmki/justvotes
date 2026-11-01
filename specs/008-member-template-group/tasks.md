# Tasks: Mitgliedergruppe

**Input**: Design documents from `/specs/008-member-template-group/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-changes.md, quickstart.md

**Tests**: Die Verfassung (Prinzip V) verlangt Tests für jede Verhaltens- und Vertragsänderung. Sie stehen je Story vor der Implementierung.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Branch `008-member-template-group` von `main` anlegen und `.specify/feature.json` auf `specs/008-member-template-group` prüfen
- [X] T002 [P] ADR anlegen in `docs/adr/0001-mitlaufende-polls-der-mitgliedergruppe.md`. Inhalt: Ausnahme vom Poll-Snapshot nur für `followsMembers`-Polls in `draft` und `active`, Optionen nur anhängen (research.md R1, R2)
- [X] T003 [P] Neue Begriffe „Mitgliedergruppe“ und „Mitlaufender Poll“ in `CONTEXT.md` ergänzen und den Eintrag „Poll-Snapshot“ um den Verweis auf die ADR erweitern

---

## Phase 2: Foundational (blockiert alle Stories)

- [X] T004 Den Vertrag `api-contract/src/main/openapi/justvotes-v1.yaml` gemäß `contracts/api-changes.md` erweitern:
  - Schema `TemplateGroupKind` (`manual` | `members`)
  - `TemplateGroup.kind` (required) und `Template.managed` (required)
  - Prüfprotokoll-Ereignis `PollOptionAdded` mit `optionNumber`, `optionText` und `reason: member-joined`
  - Fehlercode `catalog-item-managed` (409) an den Katalog-Endpunkten für Umbenennen, Löschen, Zuordnen und Entfernen
- [X] T005 Migration `bootstrap/src/main/resources/db/migration/V9__member_template_group.sql` schreiben:
  - `OptionTemplateGroup.kind TEXT NOT NULL DEFAULT 'MANUAL' CHECK (kind IN ('MANUAL','MEMBERS'))` mit partiellem Unique-Index `WHERE kind = 'MEMBERS'`
  - `OptionTemplate.memberIdentityKey TEXT UNIQUE NULL` und `Poll.followsMembers INTEGER NOT NULL DEFAULT 0`
  - Eine manuelle Gruppe namens „Alle Mitglieder“ in „Alle Mitglieder (manuell)“ umbenennen und danach die Gruppe „Alle Mitglieder“ mit `kind = 'MEMBERS'` anlegen
  - Für jedes `Account` mit `role = 'USER'` eine `OptionTemplate` (name = identity, `memberIdentityKey` = identityKey) anlegen. Eine gleichnamige Vorlage (ohne Groß- und Kleinschreibung) stattdessen übernehmen. Jeweils die Mitgliedschaft in der Gruppe eintragen.
- [X] T006 `bootstrap/src/main/java/de/justvotes/bootstrap/SqliteSchemaValidator.java` an die neuen Spalten und Indizes anpassen
- [X] T007 [P] Migrationstest in `bootstrap/src/test/java/de/justvotes/bootstrap/MemberTemplateGroupMigrationTest.java` schreiben. Er migriert eine Datenbank mit zwei User-Konten, einer gleichnamigen manuellen Vorlage und einer manuellen Gruppe „Alle Mitglieder“ und prüft:
  - genau eine `MEMBERS`-Gruppe mit zwei Mitgliedern
  - die Vorlage wurde übernommen
  - die manuelle Gruppe wurde umbenannt
  - alte Polls haben `followsMembers = 0`
  - das Administratorkonto erscheint nicht in der Gruppe

---

## Phase 3: User Story 1 – Poll über alle Mitglieder anlegen (P1) 🎯 MVP

**Goal**: Die Gruppe ist immer vorhanden, geschützt und als automatisch erkennbar. Polls aus ihr sind `followsMembers`.

**Independent Test**: quickstart.md, Szenarien 1–3.

### Tests

- [X] T008 [P] [US1] Domänentests für `OptionTemplateGroup` und `OptionTemplate` in `template-catalog/src/test/java/de/justvotes/templatecatalog/core/model/`:
  - `MEMBERS`-Gruppe lehnt rename, description, addTemplate, removeTemplate und delete mit `CatalogItemManagedException` ab
  - Vorlage mit `memberIdentity` lehnt rename und delete ab
- [X] T009 [P] [US1] Test in `poll-management/src/test/java/de/justvotes/pollmanagement/core/PollManagementTest.java`: Ein Poll aus einem Snapshot mit `followsMembers = true` behält das Merkmal nach dem Speichern und Laden. Bei manuellen Gruppen ist es `false`. Ein Poll aus der leeren Mitgliedergruppe wird wie bei jeder leeren Gruppe abgelehnt.
- [X] T010 [P] [US1] HTTP-Test in `bootstrap/src/test/java/de/justvotes/bootstrap/TemplateCatalogHttpTest.java`:
  - Der Katalog liefert „Alle Mitglieder“ mit `kind: members` und Vorlagen mit `managed: true`
  - Umbenennen, Löschen und Zuordnen ergibt 409 `catalog-item-managed`

### Implementation

- [X] T011 [P] [US1] `TemplateGroupKind` in `template-catalog/src/main/java/de/justvotes/templatecatalog/core/model/TemplateGroupKind.java` und `CatalogItemManagedException` in `template-catalog/.../core/exception/CatalogItemManagedException.java` anlegen
- [X] T012 [US1] `OptionTemplateGroup.java` um `kind` erweitern, mit Schutz in rename, description, addTemplate und removeTemplate. `OptionTemplate.java` um optionales `memberIdentity` erweitern, mit Schutz in rename. Beides in `template-catalog/.../core/model/`.
- [X] T013 [US1] `TemplateCatalogAdministration.java`: `deleteGroup` und `deleteTemplate` für verwaltete Elemente ablehnen. `ViewTemplateCatalog` liefert `kind` und `managed`.
- [X] T014 [US1] Persistenz in `adapters/src/main/java/de/justvotes/adapters/templatecatalog/infra/out/persistence/`: `OptionTemplateGroupEntity.kind`, `OptionTemplateEntity.memberIdentityKey` und das Mapping in beiden Jpa-Adaptern
- [X] T015 [US1] HTTP in `adapters/.../templatecatalog/infra/in/http/TemplateCatalogController.java`: `kind` und `managed` ausgeben, `CatalogItemManagedException` auf 409 `catalog-item-managed` abbilden
- [X] T016 [US1] `TemplateGroupSnapshot.java` um `followsMembers` erweitern und `Poll.java` um ein unveränderliches Feld `followsMembers` erweitern. `privateDraftFrom` und `reconstitue` übernehmen es. Dateien in `poll-management/.../core/model/`.
- [X] T017 [US1] `adapters/.../pollmanagement/infra/out/templatecatalog/TemplateCatalogSnapshotAdapter.java` setzt `followsMembers = (kind == MEMBERS)`. `PollEntity` und `JpaPollPersistenceAdapter` speichern `followsMembers`. `PollResponseMapper` gibt `templateGroup.kind` aus.
- [X] T018 [P] [US1] Frontend `frontend/src/features/template-catalog/`:
  - Badge „Automatisch“ für `kind === 'members'`
  - Bearbeiten-, Löschen- und Zuordnen-Aktionen für die Gruppe und für `managed`-Vorlagen ausblenden
  - Anzeigenamen der Gruppe über einen i18n-Schlüssel (de/en) übersetzen
  - Fehlercode `catalog-item-managed` übersetzen
- [X] T019 [P] [US1] Vitest-Tests für Badge und ausgeblendete Aktionen in `frontend/src/features/template-catalog/`

**Checkpoint**: Die Gruppe ist sichtbar und geschützt, und Polls aus ihr lassen sich anlegen.

---

## Phase 4: User Story 2 – Neue Mitglieder erscheinen automatisch (P1)

**Goal**: Nach Annahme einer Einladung erscheint die Identität in der Gruppe und in allen `followsMembers`-Polls in `draft` und `active`. Die Stimmen bleiben unverändert.

**Independent Test**: quickstart.md, Szenarien 4–6.

### Tests

- [X] T020 [P] [US2] Domänentests für `Poll.addMemberOption` in `poll-management/src/test/java/de/justvotes/pollmanagement/core/model/PollTest.java`:
  - hängt in DRAFT und ACTIVE mit Nummer max+1 an `options` und `templateSnapshotOptions` an
  - Stimmen bleiben unverändert
  - in EXPIRED, ARCHIVED und DELETED, bei erreichtem `endsAt`, bei `followsMembers = false` und bei schon vorhandenem Text (normalisiert) gibt es `Optional.empty()` zurück
  - nach `replaceOptions` auf einem mitlaufenden Entwurf wird nur die neue Identität angehängt
- [X] T021 [P] [US2] Test für `SyncMemberTemplates` in `template-catalog/src/test/java/de/justvotes/templatecatalog/core/`: legt die Vorlage an oder übernimmt eine gleichnamige und ordnet sie der Gruppe zu. Ein wiederholter Aufruf ist idempotent. Für eine leere Identität passiert nichts.
- [X] T022 [P] [US2] Test in `account-management/src/test/.../InvitationManagementTest.java`: `accept` ruft `MemberJoinedListener.memberJoined(identity)` genau einmal nach dem Speichern auf. Bei einem Fehler des Listeners schlägt `accept` fehl.
- [X] T023 [US2] Integrationstest in `bootstrap/src/test/java/de/justvotes/bootstrap/MemberPollExtensionHttpTest.java`:
  - Ausgangslage: aktiver Poll aus „Alle Mitglieder“ mit einer Stimme, ein Entwurf aus der Gruppe, ein abgelaufener Poll aus der Gruppe und ein aktiver Poll aus einer manuellen Gruppe
  - Aktion: Einladung annehmen
  - Erwartung: nur der aktive Poll und der Entwurf haben die neue Option am Ende, die Stimme ist unverändert, und das Prüfprotokoll enthält `PollOptionAdded` mit Akteur System

### Implementation

- [X] T024 [P] [US2] `PollOptionAdded` (pollId, optionNumber, optionText, reason `MEMBER_JOINED`, occurredAt) in `poll-management/.../core/event/PollOptionAdded.java` anlegen und im sealed `PollDomainEvent` zulassen
- [X] T025 [US2] `Poll.addMemberOption(String text, Instant at)` in `poll-management/.../core/model/Poll.java` gemäß data-model.md umsetzen. Bestehende Option-Objekte nie ersetzen (R2).
- [X] T026 [US2] Eingangsport `ExtendMemberPolls` in `poll-management/.../core/ports/in/ExtendMemberPolls.java` anlegen und in `PollManagement.java` umsetzen: `PollRepository.findFollowingMembersIn(Set.of(DRAFT, ACTIVE))`, dann je Poll `addMemberOption`, speichern und das Ereignis über `PollEventPublisher` publizieren
- [X] T027 [US2] `findFollowingMembersIn` in `PollRepository`, `SpringDataPollRepository` und `JpaPollPersistenceAdapter` umsetzen. Neue Optionen als zusätzliche Zeilen in `Option` und `PollTemplateSnapshotOption` einfügen, ohne bestehende zu löschen.
- [X] T028 [US2] Eingangsport `SyncMemberTemplates.memberJoined(String identity)` in `template-catalog/.../core/ports/in/SyncMemberTemplates.java` anlegen und in `TemplateCatalogAdministration.java` umsetzen (R5: gleichnamige Vorlage übernehmen)
- [X] T029 [US2] Ausgangsport `MemberJoinedListener` in `account-management/.../core/ports/out/MemberJoinedListener.java` anlegen. `InvitationManagement.accept` ruft ihn nach `accounts.save` auf.
- [X] T030 [US2] `adapters/src/main/java/de/justvotes/adapters/membership/MemberJoinedFanOut.java` implementiert `MemberJoinedListener` und ruft `SyncMemberTemplates`, danach `ExtendMemberPolls`. Verdrahten in `bootstrap/.../config/` innerhalb der bestehenden Annahme-Transaktion (R3).
- [X] T031 [US2] Audit-Mapping für `PollOptionAdded` in der Persistenz und HTTP-Abbildung des Prüfprotokolls unter `adapters/.../pollmanagement/` ergänzen
- [X] T032 [P] [US2] Frontend `frontend/src/features/polls/`: Prüfprotokoll-Eintrag „Option „{optionText}“ ergänzt (neues Mitglied)“ mit i18n-Texten de/en
- [X] T033 [US2] Playwright-Test in `frontend/e2e/member-group.spec.ts`: Poll aus „Alle Mitglieder“ anlegen, veröffentlichen, ein weiteres Mitglied anlegen, neu laden. Danach erscheint die neue Option, und der Axe-Check ist ohne Befund.

**Checkpoint**: FR-006 bis FR-008, FR-010 und FR-011 sind erfüllt.

---

## Phase 5: User Story 3 – Ausscheidende Mitglieder (P3)

Laut research.md R6 gibt es heute kein Löschen von Konten und damit keinen Auslöser.

- [X] T034 [US3] In `specs/008-member-template-group/spec.md` dokumentieren, dass User Story 3 und FR-009 bis zu einem Feature zum Löschen von Konten zurückgestellt sind und gesperrte Konten Mitglieder bleiben

---

## Phase 6: Polish & Cross-Cutting

- [X] T035 [P] `README.md` bzw. die Admin-Doku um einen Abschnitt zur Mitgliedergruppe ergänzen
- [ ] T036 Alle Szenarien aus `quickstart.md` manuell durchspielen
- [X] T037 Die komplette CI lokal ausführen: `mvn -s .mvn/settings.xml test`, `pnpm --dir frontend typecheck`, `pnpm --dir frontend lint`, `pnpm --dir frontend test` und `pnpm --dir frontend test:e2e`

---

## Dependencies & Execution Order

- **Reihenfolge der Phasen**:
  - Setup → Foundational (T004–T007) → US1 → US2 → US3 → Polish.
  - US2 setzt US1 voraus, weil `followsMembers` und `kind` aus US1 kommen.
  - US3 ist unabhängig.
- **Innerhalb der Stories**: Zuerst die Tests (rot), dann Modelle, Ports, Adapter und zuletzt das Frontend.
- **Abhängigkeiten im Einzelnen**:
  - T005 → T006 → T014/T017/T027
  - T004 → T015/T017/T018/T031/T032
  - T024 → T025 → T026 → T030
  - T028 und T029 → T030

## Parallel Examples

- **Setup:** T002 und T003.
- **US1:** T008, T009, T010 und T011 parallel, danach T018 und T019 parallel zum Backend ab T015.
- **US2:** T020, T021, T022 und T024 parallel, später T032 parallel zu T031.

## Implementation Strategy

- **MVP**: Phasen 1 bis 3 (US1). Die Gruppe ist nutzbar, Polls folgen aber noch nicht.
- **Wert des Features**: Phase 4 (US2). Erst dann ist der Nutzerwunsch erfüllt. Erst danach mergen.
- **Phase 5:** nur Dokumentation.

---

## Phase 7: Convergence

- [X] T038 Manuell geänderte Optionen eines Entwurfs speichern: `PollEntity` soll vorhandene Optionszeilen nach Nummer aktualisieren, überzählige Zeilen entfernen und fehlende anhängen, in `adapters/src/main/java/de/justvotes/adapters/pollmanagement/infra/out/persistence/PollEntity.java`, per FR-014 (partial)
- [X] T039 Integrationstest ergänzen: Nach dem Ersetzen der Entwurfsoptionen liefert ein erneutes Laden die neuen Optionen, und ein danach hinzukommendes Mitglied wird angehängt, in `bootstrap/src/test/java/de/justvotes/bootstrap/MemberPollExtensionHttpTest.java`, per FR-014 / US2-AS5 (missing)

---

## Phase 8: Convergence

- [X] T040 Gruppennamen in der Gruppenauswahl beim Anlegen eines Polls über `groupName()` übersetzen (Mitgliedergruppe → i18n-Schlüssel `admin.membersGroupName`) und mit einem Vitest-Test in `frontend/src/features/admin/AdminPage.test.tsx` absichern, in `frontend/src/features/admin/PollAdministration.tsx`, per plan: research R7 / Constitution i18n (partial)
