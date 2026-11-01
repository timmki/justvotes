# Implementation Plan: UX-Nacharbeiten aus der Design-Kritik

**Branch**: `009-ux-critique-followup` | **Date**: 2026-11-01 (überarbeitet nach `/speckit-analyze`) | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/009-ux-critique-followup/spec.md`

## Summary

Die Design-Kritik vom 2026-11-01 hat Orientierungs-, Struktur- und Konsistenzprobleme im
Frontend gefunden. Umgesetzt werden: bereichsspezifische Seitentitel, Kopfzeilenpfad und
Dokumenttitel in der Administration (US1); eine geschlossene Darstellung nicht aktiver
Abstimmungen mit Ergebnisaktion ganz oben (US2); eine kompakte, aufklappbare
Abstimmungsliste in der Administration mit „Neue Abstimmung“ (US3); eine gemeinsame
`FormField`-Komponente mit Validierung beim Absenden statt gesperrter Primärbuttons (US4);
verständliche Beschriftungen, abgesetzte gefährliche Aktionen und Bestätigungen mit
Objektnamen (US5); kleinere Korrekturen auf Startseite, Karten und Ergebnisseite (US6).
Die Umsetzung bleibt vollständig im Frontend; HTTP-Vertrag, Domäne und Schema sind nicht
betroffen ([research.md](research.md)).

### Überarbeitung nach `/speckit-analyze`

| Befund | Entscheidung | Artefakt |
|---|---|---|
| H1 – FR-019 vs. Stimmabgabe aus Spec 004 | Regel gilt nur für Eingabeformulare; Stimmabgabe bleibt unverändert | research R5, data-model, ui-contract §4, quickstart #11 |
| C1 – FR-032 nur in Administration | Ergebnisseite ebenfalls ohne Karte in Karte | research R8, ui-contract §6, quickstart #13 |
| C2 – Kachel-Labels Ergebnisseite | Ergebnis- und Optionsseite einbezogen | research R7, ui-contract §6 |
| U1 – Stimme-entfernen-Dialog | Dialog nennt Abstimmungstitel und Identität | ui-contract §5, quickstart #15 |
| U2 – Fehlercode Ablauf während Ansicht | `poll-not-active` (HTTP 409) | research R3, data-model, quickstart #12 |
| I1 – Admin-Pfad „gleiche Darstellung“ | gleiche Optik, nicht verlinkt | research R10 |
| A2 – SC-004 ohne Prüfung | manuelle Stoppuhr-Prüfung | quickstart #14 |
| Korrektur | Feld heißt `voteCount`, nicht `votes` | data-model, research R7 |

### Zweite Überarbeitung (nach zweitem `/speckit-analyze`)

| Befund | Entscheidung | Artefakt |
|---|---|---|
| T1 – „Löschen“ doppeldeutig | Bestätigungstext nennt immer die Umkehrbarkeit; Vorlagengruppe: „Diese Aktion kann nicht rückgängig gemacht werden.“ | ui-contract §5, research R6 |
| I4 – veralteter Offen-Hinweis | ersetzt durch diese Tabelle | plan.md |

`tasks.md` hat T1 übernommen (T043, T046). `spec.md` ist nachgezogen: FR-019 gilt nur für
Eingabeformulare (H1), US1 AS3 nennt „gleiche Optik, nicht verlinkt“ (I1), US5 AS4 zählt die
gefährlichen Aktionen einschließlich „Einladung widerrufen“ auf (S1). Keine offenen Punkte.

## Technical Context

**Language/Version**: TypeScript (strict), React 19

**Primary Dependencies**: React Router, TanStack React Query 5, Vite; keine neuen Abhängigkeiten

**Storage**: N/A (keine Datenänderungen)

**Testing**: Vitest + Testing Library (Komponenten), Playwright mit `@axe-core/playwright` (E2E)

**Target Platform**: Moderne Browser, Desktop (≥ 1024 px) und mobil (≥ 375 px)

**Project Type**: Web-Anwendung (Spring-Backend + React-SPA); diese Feature betrifft nur `frontend/`

**Performance Goals**: Keine zusätzlichen Netzwerkanfragen gegenüber heute; Aufklappen ohne
Nachladen (Daten liegen in `adminPolls` vor)

**Constraints**: Keine Ternaries im handgeschriebenen TS/JSX; sichtbare Texte nur über
`translations.ts` (de/en); Begriffe nach `CONTEXT.md`; generierter API-Client unverändert

**Scale/Scope**: ~15 Komponenten in `features/admin`, `features/polls`, `features/home`,
`features/auth`, `features/profile`, `app/Header.tsx`, `shared/ui`, `shared/i18n`, `app/styles.css`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Prinzip | Bewertung | Status |
|---|---|---|
| I. Hexagonal Domain Core | Keine Backend- oder Domänenänderung | ✅ |
| II. Contract-First API | OpenAPI unverändert; benötigte Felder (`totalVotes`, `state`, `endsAt`, `votes`) existieren bereits | ✅ |
| III. Explicit Domain Models | Keine neuen Fachregeln; nur Darstellung bestehender Zustände | ✅ |
| IV. Feature-Oriented React Frontend | Änderungen in den bestehenden Feature-Ordnern; neue wiederverwendbare Teile (`FormField`, `useDocumentTitle`) in `shared/ui/`; Disclosure-Zustand als lokaler UI-Zustand getrennt vom React-Query-Cache | ✅ |
| V. Testable Changes | Vitest-Tests je User Story, angepasste bestehende Tests, neuer Playwright-Spec mit axe | ✅ |
| Zusatz: Barrierefreiheit, Responsivität, i18n | Ziel dieser Feature; Labels, `aria-expanded`, `aria-invalid`, Fokusführung, de/en-Texte, 375 px | ✅ |
| Zusatz: Terminologie | „Löschen“/„Endgültig löschen“ ohne neue Fachbegriffe; „Optionsvorlage“, „Vorlagengruppe“, „Stimme“, „Identität“ bleiben | ✅ |
| Workflow: keine unnötigen Abhängigkeiten | Kein Head-Manager, keine UI-Bibliothek | ✅ |

**Post-Design-Recheck** (nach Überarbeitung): weiterhin erfüllt. Die Ausnahme für die
Stimmabgabe erhält bestehendes, getestetes Verhalten (Prinzip V, keine Regression); der
Fehlercode `poll-not-active` wird nur gelesen, der Vertrag bleibt unverändert (Prinzip II).
Keine Abweichungen, Complexity Tracking entfällt.

## Project Structure

### Documentation (this feature)

```text
specs/009-ux-critique-followup/
├── plan.md              # Diese Datei
├── research.md          # Phase 0: Entscheidungen R1–R9
├── data-model.md        # Phase 1: abgeleitete Darstellungswerte, lokaler UI-Zustand
├── quickstart.md        # Phase 1: Validierungsszenarien
├── contracts/
│   └── ui-contract.md   # Phase 1: verbindliche Titel, Texte, Reihenfolgen
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
frontend/
├── e2e/
│   └── ux-critique.spec.ts               # neu: Titel, geschlossene Abstimmung, axe
└── src/
    ├── app/
    │   ├── Header.tsx                    # routeContext: Administration › Bereich
    │   └── styles.css                    # Formularfelder, Danger-Gruppe, Kartenebenen, Kachel-Labels
    ├── shared/
    │   ├── ui/
    │   │   ├── PageFrame.tsx             # ruft useDocumentTitle
    │   │   ├── useDocumentTitle.ts       # neu
    │   │   ├── FormField.tsx             # neu
    │   │   └── formValidation.ts         # neu: focusFirstInvalid
    │   └── i18n/translations.ts          # neue/geänderte Schlüssel de/en
    └── features/
        ├── admin/
        │   ├── AdminPage.tsx             # Titel/Untertitel je Bereich
        │   ├── PollAdministration.tsx    # Disclosure-Liste, Neue Abstimmung, Danger-Gruppe
        │   ├── AdministrativeVotes.tsx   # Abschnittsüberschrift, FormField
        │   ├── TemplateCatalog.tsx       # Labels, FormField, Bestätigungstexte
        │   ├── AccountAdministration.tsx # Danger-Gruppe
        │   └── InvitationAdministration.tsx / ContactImport.tsx  # Überschriften, FormField
        ├── polls/
        │   ├── PollPage.tsx              # geschlossene Darstellung
        │   ├── PollClosedNotice.tsx      # neu
        │   ├── PollOptionRow.tsx         # Abstand Auswahlkreis/Text
        │   ├── PublicPollCard.tsx        # Datumspräfix
        │   └── ResultsPages.tsx          # Optionsname als Text, „Stimmen ansehen“, Optionen als Zeilen
        ├── home/HomePage.tsx             # Reihenfolge, ein Link
        ├── auth/LoginPage.tsx, PasswordChangePage.tsx, InvitationPage.tsx  # FormField, Validierung beim Absenden
        └── profile/ProfilePage.tsx       # Spaltennamen, lokale Zeit
```

**Structure Decision**: Bestehende Feature-Struktur der SPA unter `frontend/src/features/`;
gemeinsame Bausteine unter `frontend/src/shared/ui/`. Kein Backend- oder Vertragsanteil.

## Umsetzungsreihenfolge (Vorschlag für /speckit-tasks)

1. Grundlagen: `useDocumentTitle`, `FormField`, Übersetzungsschlüssel, CSS für Felder und
   Danger-Gruppe.
2. US1 (Seitentitel, Kopfzeilenpfad) – unabhängig.
3. US2 (geschlossene Abstimmung) – unabhängig.
4. US3 (Administrationsliste) – nutzt Danger-Gruppe aus 1.
5. US4 (Formulare umstellen) – nutzt `FormField`.
6. US5 (Beschriftungen, Bestätigungen) – größtenteils Übersetzungen, nach US3 für die Abstimmungsaktionen.
7. US6 (Kleinkorrekturen) – unabhängig.
8. Abschluss: Kartenebenen (R8), Playwright-Spec mit axe, Quickstart-Szenarien.

## Complexity Tracking

Keine Verstöße gegen die Constitution; Abschnitt entfällt.
