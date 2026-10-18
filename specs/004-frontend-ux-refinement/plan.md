# Implementation Plan: Frontend UX Refinement

**Branch**: `004-frontend-ux-refinement` | **Date**: 2026-10-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-frontend-ux-refinement/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Frontend-only refinement pass after spec 003, based on the `[change]` items in
`design-handoff.md` and the three clarifications of 2026-10-18. The largest behavioural change
is on the poll page: choosing an option only marks it, and a new "Stimme abgeben" button sends
the vote (loading state, double-submit guard, enabled only for a selection that differs from the
current vote). This also fixes arrow-key navigation, which currently casts a vote for every
option it passes. Around that flow: one state-dependent identity action label
("Identität festlegen" / "Identität ändern") everywhere including the mobile menu on the start
page; stronger visual disabled state plus focus move and a polite announcement after the
identity is saved; a fact line (state · ends at · vote count) under the poll title replacing
the subtitle and the duplicate date.

Visually, a per-theme set of CSS custom properties replaces the ten hard-coded `#007aff`
values across the whole frontend (accent, focus, radios, spinners, primary button), while
spacing, radius and type scales are applied only to the app shell, start, list and poll pages.
The mobile menu gets a backdrop, scroll lock, focus containment and even padding; the start
page loses the empty band left by the hidden `h1`; stats stack below 640px; long titles and
option labels wrap correctly; short transitions respect `prefers-reduced-motion`.

No backend, OpenAPI or persistence change: the vote is still `castVote(pollId, optionNumber)`,
only triggered from a button instead of the radio `onChange` ([research R1](research.md#r1-explicit-vote-submission)).

## Technical Context

**Language/Version**: TypeScript 5.7 (strict), React 19, Vite 6

**Primary Dependencies**: React Router 7, TanStack React Query 5, existing central API client
(`frontend/src/shared/api/`), existing i18n resources (`frontend/src/shared/i18n/translations.ts`),
`@fontsource/work-sans`. No new dependencies.

**Storage**: N/A (theme and locale keep their existing browser storage; selected option is
local component state and is intentionally not persisted)

**Testing**: Vitest 3 + Testing Library (`*.test.tsx`, `PollRoutes.integration.test.tsx`,
setup in `frontend/src/test/setup.ts`), Playwright 1.50 with `@axe-core/playwright`
(`frontend/e2e/app-shell.spec.ts`, `profile.spec.ts`)

**Target Platform**: Evergreen desktop and mobile browsers; reference viewports 320, 375×812,
768 and 1024px; themes `light` (Hell), `dark` (Dunkel), `claude` (Sepia), `openai` (Eco)

**Project Type**: React/Vite SPA inside the existing same-origin Spring Boot web application

**Performance Goals**: No additional requests. The poll page keeps one poll, one results and
one identity query; a vote is still exactly one `castVote` request per confirmed submission

**Constraints**: No ternaries in handwritten TS/TSX; feature-oriented modules; all visible
text through `translations.ts` (de + en); domain terms from `CONTEXT.md` (Identität, Stimme,
Prüfprotokoll); keyboard operation and visible focus; no horizontal scroll at 320px; every
animation ≤ 200ms and disabled under `prefers-reduced-motion`

**Scale/Scope**: `styles.css` (≈3,100 lines, four theme blocks, 10 × `#007aff`, 3 ×
`.poll-metadata` blocks), `Header.tsx`, `PageFrame.tsx`, `IdentityEditor.tsx`,
`PollPage.tsx`, `PublicPollCard.tsx`, `HomePage.tsx`, `PollsPage.tsx`, `translations.ts`;
the matching Vitest files and `app-shell.spec.ts`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Guide | Assessment | Status |
|---|---|---|
| I. Hexagonal Domain Core | No backend change | Pass (n/a) |
| II. Contract-First API | `justvotes-v1.yaml` and generated sources stay untouched; voting keeps the existing `castVote` call ([R1](research.md#r1-explicit-vote-submission)) | Pass |
| III. Explicit Domain Models | No domain rule changes; a vote still means "current choice of one option of an identity" (`CONTEXT.md`), only its UI trigger changes | Pass (n/a) |
| IV. Feature-Oriented React Frontend | Vote form state stays in `features/polls`; generic pieces (`PageFrame` meta slot, `IdentityEditor` `onSaved`, menu, tokens) in `shared/ui` / `app`; server state stays in React Query, selection/menu/notice state is local | Pass |
| V. Testable Changes | Vitest covers vote form, labels, focus and announcement; Playwright covers contrast per theme, menu backdrop/scroll lock/focus, reduced motion and 320px overflow; the existing vote e2e test is adapted to the submit button ([R10](research.md#r10-test-strategy)) | Pass |
| Accessibility constraint | Native radio group with submit button (arrow keys no longer vote); disabled `fieldset` + `aria-describedby`; polite status after identity save; menu with Escape, backdrop, focus containment and focus return; `aria-busy` on loading buttons; ≥ 44px targets | Pass |
| i18n / terminology constraint | New keys in `de` and `en` (`identitySet`/`identityChange`, `submitVote`, `identitySavedCanVote`, fact line); `identityEdit` and `pollDescription` removed; "Stimme", "Identität", "Prüfprotokoll" kept | Pass |
| Development workflow (no unnecessary abstractions/deps) | CSS custom properties and `@starting-style`-free transitions; no animation or focus-trap library | Pass |
| `docs/development/frontend.md` | No ternaries, strict TS, central API client unchanged, no new deps | Pass |
| `docs/development/java.md` | Not affected | Pass (n/a) |

**Post-design re-check**: Pass. The design artifacts introduce no API, schema or dependency
change and no constitution deviation. The change from instant voting to explicit submission
is a requested behaviour change (spec clarification Q1), not a contract change. Complexity
Tracking stays empty.

## Project Structure

### Documentation (this feature)

```text
specs/004-frontend-ux-refinement/
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R11
├── data-model.md        # Phase 1: UI state models and design token set
├── quickstart.md        # Phase 1: validation guide
├── contracts/
│   └── ui-contract.md   # Phase 1: DOM/ARIA, text and token contract
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── app/
│   │   ├── styles.css            # tokens (:root + 3 theme blocks), #007aff removal, metadata
│   │   │                         # consolidation, menu backdrop, stats, filters, motion
│   │   ├── Header.tsx            # menu backdrop, scroll lock, focus containment, identity label
│   │   └── App.test.tsx
│   ├── features/
│   │   ├── home/
│   │   │   ├── HomePage.tsx      # identity action label; stats markup unchanged (CSS only)
│   │   │   └── HomePage.test.tsx
│   │   └── polls/
│   │       ├── PollPage.tsx      # fact line, submit button, selection state, focus/announce
│   │       ├── PollFactLine.tsx  # new: state · ends at · vote count
│   │       ├── PublicPollCard.tsx# 3-line title clamp
│   │       ├── PollsPage.tsx     # filter control classes
│   │       ├── pollPageShared.tsx# DataPage passes `meta` instead of `description`
│   │       └── *.test.tsx, PollRoutes.integration.test.tsx
│   └── shared/
│       ├── i18n/translations.ts  # label keys (de + en)
│       └── ui/
│           ├── PageFrame.tsx     # `meta` slot; hidden title without layout gap
│           ├── IdentityEditor.tsx# `onSaved` callback; state-dependent heading/label
│           └── IdentityDialog.tsx
└── e2e/
    └── app-shell.spec.ts         # contrast, menu, motion, 320px, adapted vote flow
```

**Structure Decision**: Existing web application layout. All changes stay in `frontend/`;
`backend/` and `api-contract/` are not touched.

## Complexity Tracking

No constitution violations; nothing to justify.
