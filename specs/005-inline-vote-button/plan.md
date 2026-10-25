# Implementation Plan: Inline Vote Button

**Branch**: `005-inline-vote-button` | **Date**: 2026-10-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-inline-vote-button/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Frontend-only follow-up to spec 004. The "Stimme abgeben" confirm button (in code: the row's submit button) moves from below the option list into the
selected option row, at its end edge. It is rendered only while the poll is active, the person can vote and the
selection differs from the current vote, so at most one exists. From 640px it shows its text; below 640px it shows a
check-mark icon. Its accessible name is always "Stimme abgeben: <option>". A failed vote shows its alert inside the
selected option, and focus returns to the button. While the button is shown, the option text keeps the number of
lines it had without the button and is cut off with "…", so no row changes height.

To make this valid HTML, each option becomes a row container holding the radio label and, when selected, the submit
button as a sibling (a button may not sit inside a `<label>`, [research R1](research.md#r1-option-row-markup)). The
row height comes from a hidden copy of the text at its unselected width; the visible text is size-contained and
clamped to that copy's line count ([R3](research.md#r3-keeping-the-line-count)). The grid uses margins instead of
`column-gap` so the copy is exactly as wide as the unselected text, and every grid child has an explicit row and
column so the button cannot be auto-placed into a second row ([R1](research.md#r1-option-row-markup)).
Voting logic, the mutation, the identity flow and the status announcement from spec 004 stay as they are.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict), React 19, Vite 6

**Primary Dependencies**: TanStack React Query 5 (existing `useCastVoteMutation`), existing i18n resources
(`frontend/src/shared/i18n/translations.ts`). No new dependencies; the check mark is an inline SVG.

**Storage**: N/A (selection stays local component state)

**Testing**: Vitest 3 + Testing Library (`PollRoutes.integration.test.tsx`), Playwright 1.50 with
`@axe-core/playwright` (`frontend/e2e/app-shell.spec.ts`, `profile.spec.ts`)

**Target Platform**: Evergreen desktop and mobile browsers; viewports 320, 375, 768 and 1024px; themes `light`,
`dark`, `claude`, `openai`

**Project Type**: React/Vite SPA inside the existing same-origin Spring Boot web application

**Performance Goals**: No additional requests; still exactly one `castVote` request per activation. Line measuring
uses one `ResizeObserver` per poll page, no layout work on every render.

**Constraints**: No ternaries in handwritten TS/TSX; all visible text and accessible names through `translations.ts`
(de + en); no `<button>` inside `<label>`; ≥ 44×44px target; no horizontal scroll at 320px; no row height change
> 1px on selection; motion disabled under `prefers-reduced-motion`

**Scale/Scope**: `PollPage.tsx` (option list, submit button, error placement, focus after vote), a new
`PollOptionRow.tsx` in `features/polls`, `styles.css` (`.poll-option*` rules incl. Sepia/Eco overrides),
`translations.ts` (one key), `PollRoutes.integration.test.tsx`, `app-shell.spec.ts`, `profile.spec.ts`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Guide | Assessment | Status |
|---|---|---|
| I. Hexagonal Domain Core | No backend change | Pass (n/a) |
| II. Contract-First API | `justvotes-v1.yaml` and generated sources untouched; same `castVote(pollId, optionNumber)` call | Pass |
| III. Explicit Domain Models | No domain rule change; "Stimme" keeps its meaning, only the trigger's position changes | Pass (n/a) |
| IV. Feature-Oriented React Frontend | Row component lives in `features/polls`; server state stays in React Query, selection/line count are local UI state | Pass |
| V. Testable Changes | Vitest: one button, moves with selection, accessible name, inline error, focus after vote. Playwright: position at end edge, icon vs text by width, row height stable, no overflow, axe, contrast in four themes ([R6](research.md#r6-test-strategy)) | Pass |
| Accessibility constraint | Native radio group kept; button follows the selected radio in tab order; accessible name includes the option; inline `role="alert"`; focus moves to the voted radio after success and back to the button after failure | Pass |
| i18n / terminology | New key `polls.submitVoteFor` in de + en; "Stimme abgeben" kept | Pass |
| Development workflow (no unnecessary abstractions/deps) | One small row component, inline SVG, `ResizeObserver` from the platform | Pass |
| `docs/development/frontend.md` | No ternaries, strict TS, feature folder, central API client unchanged | Pass |

**Post-design re-check**: Pass. The design adds no API, schema or dependency change. Complexity Tracking stays empty.

## Project Structure

### Documentation (this feature)

```text
specs/005-inline-vote-button/
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R6
├── data-model.md        # Phase 1: UI state of the option row
├── quickstart.md        # Phase 1: validation guide
├── contracts/
│   └── ui-contract.md   # Phase 1: DOM/ARIA, text and layout contract
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── app/
│   │   └── styles.css                 # .poll-option row grid, button, icon swap at 40rem,
│   │                                  # line clamp, ghost text, inline error, theme overrides
│   ├── features/polls/
│   │   ├── PollPage.tsx               # renders rows, drops the list-level button and error,
│   │   │                              # focus to voted radio after success
│   │   ├── PollOptionRow.tsx          # new: label + radio + text/ghost, submit button, error
│   │   └── PollRoutes.integration.test.tsx
│   └── shared/i18n/translations.ts    # polls.submitVoteFor (de + en)
└── e2e/
    ├── app-shell.spec.ts              # position, icon/text, row height, overflow, contrast
    └── profile.spec.ts                # adapted vote flow selectors
```

**Structure Decision**: Existing web application layout. All changes stay in `frontend/`; `backend/` and
`api-contract/` are not touched.

## Complexity Tracking

No constitution violations; nothing to justify.
