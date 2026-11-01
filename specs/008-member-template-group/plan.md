# Implementation Plan: Mitgliedergruppe

**Branch**: `008-member-template-group` | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/008-member-template-group/spec.md`

## Summary

Der Vorlagenkatalog erhält eine einzige, vom System gepflegte Vorlagengruppe „Alle Mitglieder“. Sie wird per Flyway-Migration angelegt und mit den vorhandenen User-Identitäten befüllt.

Polls, die aus dieser Gruppe entstehen, tragen dauerhaft das Merkmal „folgt den Mitgliedern“. Bei jeder angenommenen Einladung läuft in derselben Transaktion Folgendes ab:

1. Account-Management meldet ein neues Mitglied.
2. Der Katalog legt die Mitglieds-Optionsvorlage an.
3. Poll-Management hängt allen mitlaufenden Polls in `draft` und `active` eine Option an und protokolliert dafür ein `PollOptionAdded`-Ereignis.

Bestehende Optionen, ihre Nummern und alle Stimmen bleiben unangetastet. Die Ausnahme vom unveränderlichen Poll-Snapshot wird als ADR und in `CONTEXT.md` festgehalten.

## Technical Context

**Language/Version**: Java 21 (Backend), TypeScript/React (Frontend)

**Primary Dependencies**:
- Spring Boot (nur in `adapters`/`bootstrap`)
- Flyway, SQLite
- OpenAPI-Generator
- React, TanStack Query, i18n-Ressourcen

**Storage**: SQLite. Neu ist die Migration `V9__member_template_group.sql`.

**Testing**:
- JUnit-Domänentests je Modul
- Adapter- und Integrationstests (Spring, SQLite)
- Vitest
- Playwright mit Axe

**Target Platform**: Linux-Container (amd64/arm64)

**Project Type**: Webanwendung (hexagonales Maven-Backend und SPA)

**Performance Goals**: Neue Option spätestens 5 s nach Annahme sichtbar (SC-002). Erreicht durch synchrone Ausführung in der Annahme-Transaktion.

**Constraints**:
- Keine abgegebene Stimme darf verloren gehen.
- Optionsnummern bleiben stabil.
- Schreibzugriffe in SQLite sind serialisiert. Das schließt doppelte Optionen bei gleichzeitigen Annahmen zusätzlich über Unique-Constraints aus.

**Scale/Scope**: Vereinsgröße, also bis etwa einige hundert Mitglieder und wenige Dutzend offene Polls.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Prinzip | Bewertung |
|---------|-----------|
| I. Hexagonal Domain Core | ✅ Die Regeln liegen in den Domänenmodulen: `OptionTemplateGroup.kind`, `Poll.addMemberOption`. Modulübergreifend wird nur über Ports gekoppelt, verdrahtet in `adapters`. |
| II. Contract-First API | ✅ `TemplateGroup.kind` und die Fehlercodes `catalog-item-managed` sowie `PollOptionAdded` im Prüfprotokoll werden zuerst im OpenAPI-Vertrag ergänzt. Die Erweiterung ist additiv. |
| III. Explicit Domain Models | ✅ Neuer typisierter Enum `TemplateGroupKind` und neues Domänenereignis `PollOptionAdded`. Die Invarianten prüft das Aggregat. |
| IV. Feature-Oriented Frontend | ✅ Die Änderungen bleiben im Feature Vorlagenkatalog (Badge, gesperrte Aktionen) und in den bestehenden Poll- und Prüfprotokoll-Ansichten. |
| V. Testable Changes | ✅ Domänen-, Integrations- und E2E-Tests sind je User Story geplant (siehe [quickstart.md](quickstart.md)). |
| Flyway-only Schema | ✅ Alle Änderungen kommen in V9, inklusive Backfill. |
| i18n / Fachbegriffe | ✅ Neue Texte stehen in den i18n-Ressourcen. `CONTEXT.md` bekommt die Begriffe „Mitgliedergruppe“ und „Mitlaufender Poll“. |

**Ergebnis**: Kein Verstoß. Die fachliche Abweichung vom Begriff „Poll-Snapshot“ ist kein Verstoß gegen die Verfassung, wird aber per ADR dokumentiert.

## Project Structure

### Documentation (this feature)

```text
specs/008-member-template-group/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api-changes.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
template-catalog/src/main/java/de/justvotes/templatecatalog/core/
├── model/OptionTemplateGroup.java        # + kind (MANUAL | MEMBERS)
├── model/OptionTemplate.java             # + memberIdentity (optional)
├── model/TemplateGroupKind.java          # neu
├── exception/CatalogItemManagedException.java   # neu
├── ports/in/SyncMemberTemplates.java     # neu: memberJoined(identity)
└── TemplateCatalogAdministration.java    # Schutz verwalteter Elemente + Sync

poll-management/src/main/java/de/justvotes/pollmanagement/core/
├── model/Poll.java                       # + followsMembers, addMemberOption(text)
├── model/TemplateGroupSnapshot.java      # + followsMembers
├── event/PollOptionAdded.java            # neu
├── ports/in/ExtendMemberPolls.java       # neu: memberJoined(identity)
├── ports/out/PollRepository.java         # + findFollowingMembersIn(states)
└── PollManagement.java

account-management/src/main/java/de/justvotes/accountmanagement/core/
├── ports/out/MemberJoinedListener.java   # neu
└── InvitationManagement.java             # meldet nach accept()

adapters/src/main/java/de/justvotes/adapters/
├── membership/MemberJoinedFanOut.java    # neu: Listener → Katalog + Polls
├── templatecatalog/...                   # Entity/Mapper: kind, memberIdentityKey; 409-Mapping
└── pollmanagement/...                    # Entity: followsMembers; Audit-Mapping PollOptionAdded

bootstrap/src/main/resources/db/migration/V9__member_template_group.sql
api-contract/src/main/openapi/justvotes-v1.yaml
frontend/src/features/template-catalog/   # Badge, gesperrte Aktionen, i18n
frontend/src/features/polls/              # Prüfprotokoll-Eintrag „Option ergänzt“
docs/adr/0001-mitlaufende-polls-der-mitgliedergruppe.md
CONTEXT.md
```

**Structure Decision**: Bestehendes Multi-Modul-Layout. Neue Fachlogik kommt in die drei Domänenmodule. Die Verdrahtung über Modulgrenzen hinweg liegt ausschließlich in `adapters`.

## Complexity Tracking

Keine Verstöße. Einzige bewusste fachliche Ausnahme ist das Mitlaufen der Polls (siehe research.md, R1, und die ADR).
