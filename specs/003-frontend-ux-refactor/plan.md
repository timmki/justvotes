# Implementation Plan: Frontend UX Refactoring

**Branch**: `003-frontend-ux-refactor` | **Date**: 2026-10-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-frontend-ux-refactor/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Frontend-only refactoring of the public start page, poll list and poll detail page based on
the design critique in `refactor-frontend.md`. The core flow changes are: the poll page offers
the existing identity editor in place above disabled options; the poll list defaults to a new
`all` date filter and its empty state names the active filter with a reset action; and narrow
viewports get a single compact header with a disclosure menu that holds navigation and a
read-only identity status whose edit action opens the identity editor in a dialog. The
remaining work tightens hierarchy (poll title as `h1`, one identity card, no repeated featured
poll, metadata panel without fill or shadow), consolidates poll state and vote count
presentation into shared poll components (vote counts also on results and option pages),
separates link and action styles, fixes plural and copy issues in both locales (German
„Audit“ → „Prüfprotokoll“ everywhere), and closes the reported accessibility gaps, including a
measured ≥ 3:1 radio border contrast per theme.

Clarifications of 2026-10-18 (spec.md) are incorporated; see research R4, R9, R11–R14. The
second analysis run added R15 (`matchMedia` guard + Vitest setup stub), R16 („Prüfprotokoll“ in
`CONTEXT.md`) and R17 (shared `IdentityStatus`).

No backend, OpenAPI or persistence change is needed: `GET /polls` has no date parameter and
date filtering already happens client-side in `pollListState.ts`.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict), React 19, Vite 6

**Primary Dependencies**: React Router 7, TanStack React Query 5, existing central API client
(`frontend/src/shared/api/`), existing i18n resources (`frontend/src/shared/i18n/translations.ts`).
No new dependencies.

**Storage**: N/A (list filter state stays in the URL query; theme and locale keep their existing
browser storage)

**Testing**: Vitest + Testing Library (`*.test.tsx`, `PollRoutes.integration.test.tsx`),
Playwright with `@axe-core/playwright` (`frontend/e2e/app-shell.spec.ts`)

**Target Platform**: Evergreen desktop and mobile browsers; reference viewports 375×812 and
≥ 1280px desktop; themes `light`, `dark`, `claude` (Sepia), `openai` (Eco)

**Project Type**: React/Vite SPA inside the existing same-origin Spring Boot web application

**Performance Goals**: No additional requests. The poll page keeps one poll, one results and
one identity query; the list keeps one `GET /polls` request (existing N+1 browser test stays green)

**Constraints**: No ternaries in handwritten TS/TSX; feature-oriented modules; all visible text
through `translations.ts` (de + en); domain terms from `CONTEXT.md` (Identität, Stimme,
Poll-Lebenszyklus); keyboard operation and visible focus for the new menu and inline editor;
no horizontal scroll at 320–375px

**Scale/Scope**: ~10 components and `styles.css` (≈2,900 lines, four theme blocks) in
`frontend/src/app`, `features/home`, `features/polls`, `shared/ui`, `shared/i18n`; 4 unit test
files, 1 integration test file and the Playwright shell spec to adjust

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Guide | Assessment | Status |
|---|---|---|
| I. Hexagonal Domain Core | No backend change | Pass (n/a) |
| II. Contract-First API | `justvotes-v1.yaml` and generated sources stay untouched; `all` filter is client-side ([research R2](research.md#r2-filter-alle-ohne-api-änderung)) | Pass |
| III. Explicit Domain Models | No domain rule changes; poll state labels keep using `pollStateTranslationKey` | Pass (n/a) |
| IV. Feature-Oriented React Frontend | Poll-specific UI (`PollStateBadge`, vote count formatting) lives in `features/polls`; generic pieces (`RouteState` action slot, `PageFrame` hidden title, menu) in `shared/ui` / `app`; server state remains in React Query, menu/editor/filter state is local or URL state | Pass |
| V. Testable Changes | Each user story has Vitest coverage and the shell spec gains viewport, landmark and touch target checks; CI suites (frontend unit, typecheck, lint, Playwright, container) must stay green | Pass |
| Accessibility constraint | New menu follows the disclosure pattern (`aria-expanded`, `aria-controls`, Escape, focus return); identity dialog with a single focus trap and inline confirmation (R13); disabled options exposed via the disabled `fieldset`; unique landmarks; ≥ 44px targets; radio border contrast measured per theme (R11) | Pass |
| i18n / terminology constraint | All new strings added to `de` and `en`; "Audit" in German UI replaced by "Prüfprotokoll", which is added to `CONTEXT.md` (R16); "Identität"/"Stimme" kept | Pass |
| V. Quality gates (test environment) | `matchMedia` is guarded and stubbed in a Vitest setup file so existing `Header` tests keep running (R15) | Pass |
| `docs/development/frontend.md` | No ternaries, strict TS, central API client unchanged, no new deps | Pass |
| `docs/development/java.md` | Not affected | Pass (n/a) |

**Post-design re-check**: Pass. The design artifacts introduce no API, schema or dependency
change and no constitution deviation; Complexity Tracking stays empty.

## Project Structure

### Documentation (this feature)

```text
specs/003-frontend-ux-refactor/
├── plan.md              # This file
├── research.md          # Phase 0 decisions
├── data-model.md        # UI state and view models
├── quickstart.md        # Validation guide
├── contracts/
│   └── ui-contract.md   # URL, accessibility and component contracts
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit-tasks - NOT created here)
```

### Source Code (repository root)

```text
frontend/src/
├── app/
│   ├── Header.tsx              # AppShell + Header: mobile menu button/panel, single nav landmark,
│   │                           #   sidebar identity status rules
│   ├── App.tsx                 # unchanged routes; possibly AppShell props only
│   ├── App.test.tsx            # mobile menu, landmarks
│   └── styles.css              # header/menu breakpoints, link vs button styles, badge, metadata,
│                               #   eyebrow size, touch targets, radio indicators, 4 themes
├── features/home/
│   ├── HomePage.tsx            # hidden h1, identity CTA, featured poll unboxed + excluded from latest
│   └── HomePage.test.tsx
├── features/polls/
│   ├── PollPage.tsx            # poll title as h1, identity notice + inline editor, disabled options,
│   │                           #   no option number line, metadata without generic heading, "Endet am"
│   ├── PollsPage.tsx           # "Alle" option, filter-aware empty state with reset
│   ├── pollListState.ts        # PollDateFilter 'all' (default), serialization
│   ├── PublicPollCard.tsx      # PollStateBadge, labelled vote count, accessible name
│   ├── PollStateBadge.tsx      # NEW shared poll state badge
│   ├── pollFormatters.ts       # formatVoteCount (Intl.PluralRules)
│   ├── AuditPage.tsx / ResultsPages.tsx  # PollStateBadge; formatVoteCount on results + option pages
│   └── *.test.ts(x), PollRoutes.integration.test.tsx
├── shared/ui/
│   ├── IdentityEditor.tsx      # startEditing/onClose props, confirmation 'dialog' | 'inline',
│   │                           #   primary CTA when unset
│   ├── IdentityDialog.tsx      # NEW modal wrapper for the mobile menu edit action (R13)
│   │                           #   (IdentityEditor.tsx also exports IdentityStatus, R17)
│   ├── PageFrame.tsx           # optional visually hidden title
│   └── RouteState.tsx          # optional action slot for empty state
└── shared/i18n/translations.ts # new/changed keys (de + en)

frontend/src/test/setup.ts      # NEW Vitest setup: window.matchMedia stub (R15)
frontend/vitest.config.ts       # register test.setupFiles
CONTEXT.md                      # glossary entry „Prüfprotokoll“ (R16)
frontend/e2e/app-shell.spec.ts  # 375px header height, menu + identity dialog, landmarks, targets,
                                #   filter default, radio contrast per theme, metadata panel styles
```

**Structure Decision**: Frontend-only change inside the existing feature layout. Poll-specific
presentation (state badge, vote count) goes to `features/polls`; reusable, domain-free building
blocks (empty state action, hidden page title) extend existing `shared/ui` components; shell and
navigation stay in `app/`.

## Implementation Phases (for `/speckit-tasks`)

1. **Foundations** — Vitest `matchMedia` setup (R15), `IdentityStatus` (R17), translations (plural keys, `endsAt`, `Prüfprotokoll`, menu/filter/notice
   strings), `formatVoteCount`, `PollStateBadge`, `RouteState` action slot, `PageFrame` hidden
   title, link/button style tokens in `styles.css`.
2. **US1 Identity → vote (P1)** — `IdentityEditor` inline mode; `PollPage` notice above options,
   disabled option styling; `HomePage` identity CTA.
3. **US2 List filter (P1)** — `pollListState` `all` default + tests; `PollsPage` option and empty
   state.
4. **US3 Mobile header (P1)** — `Header.tsx` menu button + disclosure panel with navigation and
   read-only identity status, sidebar hidden below 900px, nav rendered once, close on
   Escape/outside click/route change/resize; `IdentityDialog` with inline confirmation for the
   edit action; no edit action on `/` without identity; CSS.
5. **US4 Hierarchy (P2)** — poll title `h1`, home hidden `h1`, one identity card (sidebar and
   menu rules), featured poll excluded, metadata panel without fill/shadow.
6. **US5 Consistency (P3)** — badge and vote count adoption (incl. results/option pages), link
   vs action classes, unboxed featured card.
7. **US6 Copy (P4)** — remove option number line, "Endet am", plural everywhere, all German
   „Audit“ strings → „Prüfprotokoll“.
8. **US7 Accessibility (P5)** — targets, eyebrow size, radio indicator (`appearance: none`,
   explicit border) with measured contrast, card link names.
9. **Validation** — unit/integration/e2e updates and the manual theme × viewport pass in
   [quickstart.md](quickstart.md).

## Complexity Tracking

No constitution violations.
