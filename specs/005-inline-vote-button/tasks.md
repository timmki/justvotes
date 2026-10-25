---

description: "Task list for Inline Vote Button"
---

# Tasks: Inline Vote Button

**Input**: Design documents from `/specs/005-inline-vote-button/`

**Prerequisites**: `plan.md`, `spec.md` (incl. Clarifications 2026-10-19), `research.md` (R1–R6), `data-model.md`,
`contracts/ui-contract.md`, `quickstart.md` (all revised 2026-10-19 after `/speckit-analyze`: no grid `column-gap`,
`contain: block-size` on the clamped text, focus back on the button after a failed vote, error rows excluded from
SC-006; second pass: explicit grid placement for every row child, ghost outside the label)

**Tests**: Test tasks are included because constitution principle V requires frontend and end-to-end coverage for
changed user flows.

**Organization**: Tasks are grouped by user story (US1–US3 from `spec.md`). US1 (P1) is the MVP. All paths are
relative to the repository root.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: Maps the task to a user story from `spec.md`
- Conventions for every task: no ternaries, strict TypeScript, every visible string and accessible name in both `de`
  and `en` of `frontend/src/shared/i18n/translations.ts`, theme overrides for `light`, `dark`, `claude` (Sepia) and
  `openai` (Eco) in `frontend/src/app/styles.css`, spacing/radius/type through the existing tokens
  (`docs/development/frontend.md`, spec 004 token contract)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the baseline

- [X] T001 Run `pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm test:e2e` in `frontend/` and record the green baseline; do not modify `api-contract/src/main/openapi/justvotes-v1.yaml` or the dependencies in `frontend/package.json` in this feature

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Text key and row component skeleton used by all stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 [P] Add `polls.submitVoteFor` = `Stimme abgeben: {option}` (de) and `Cast vote: {option}` (en) to `frontend/src/shared/i18n/translations.ts`; keep `polls.submitVote` (contracts/ui-contract.md „Texts“)
- [X] T003 Create `frontend/src/features/polls/PollOptionRow.tsx` exporting `PollOptionRow` with props `option: {number: number; text: string}`, `name: string`, `selected`, `current`, `showSubmit`, `pending: boolean`, `error: FrontendError | null`, `onSelect: () => void` (data-model.md „Option row view model“). Render `div.poll-option` (classes `selected` / `current` as today, built without ternaries) containing `label.poll-option-label` with the radio (`aria-label={option.text}`, `checked={selected}`, `onChange={onSelect}`) and `span.poll-option-text` (`<strong>` text, `<small>{t('polls.yourVote')}</small>` when `current`). Do not render the button inside the `<label>` (research R1). U6 (analysis): the row `div` handles clicks on its padding
  and empty space and selects the option, unless the fieldset is disabled or the click is on the button or the error,
  so the tap area stays the whole row as before

**Checkpoint**: Key and row component exist; `PollPage` not yet switched

---

## Phase 3: User Story 1 - Confirm the vote on the chosen option (Priority: P1) 🎯 MVP

**Goal**: The submit button appears only inside the selected option, at its end edge, and moves with the selection

**Independent Test**: With an identity on an active poll, select an option: exactly one button exists, inside that
row; activating it sends one vote and the button disappears

### Tests for User Story 1

- [X] T004 [P] [US1] Add tests to `frontend/src/features/polls/PollRoutes.integration.test.tsx`: no `.poll-option-submit` before selection; after selecting option B exactly one submit button exists and `closest('.poll-option')` is B's row; selecting C moves it to C's row; none when the selection equals the current vote, without identity, or on a closed poll; one `castVote` call per click; while the vote is pending the row button has `aria-busy="true"`, is disabled, contains `.button-spinner` instead of the check-mark icon, and all radios are disabled (FR-005); after success no submit button; accessible name is `Stimme abgeben: <option text>`. Update the existing tests that query `getByRole('button', {name: 'Stimme abgeben'})` to the new name (contracts/ui-contract.md „Poll page“)
- [X] T005 [P] [US1] Adapt `frontend/e2e/app-shell.spec.ts` and `frontend/e2e/profile.spec.ts` vote flows to click the button inside the selected row (`page.locator('.poll-option.selected').getByRole('button')`); add a test that the button's right edge is within the row's right padding (≤ the row's content box end + 1px) at 1024px

### Implementation for User Story 1

- [X] T006 [US1] In `PollOptionRow.tsx` render, when `showSubmit`, a sibling `button.poll-option-submit[type=submit]` after the label with `aria-label={t('polls.submitVoteFor').replace('{option}', option.text)}`, `disabled={pending}`, `aria-busy={pending}`, content: `.button-spinner` when `pending`, otherwise an inline SVG check mark (`aria-hidden="true"`, `focusable="false"`, `.poll-option-submit-icon`), plus `span.poll-option-submit-text` with `t('polls.submitVote')` (research R2)
- [X] T007 [US1] In `frontend/src/features/polls/PollPage.tsx` replace the inline option `<label>` markup with `PollOptionRow`, passing `selected`, `current`, `showSubmit = selected && (submitEnabled || mutation.isPending)`, `pending = selected && mutation.isPending`; remove the list-level `<button type="submit">` after the fieldset (FR-003); keep `submitVote` as the form `onSubmit` handler
- [X] T008 [US1] Restyle the row in `frontend/src/app/styles.css`: `.poll-option` becomes `display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: start` with **no** `column-gap` (an empty third column must add no width, research R3); `.poll-option-label { display: contents }`; every grid child is placed explicitly, never auto-placed (research R1): radio `grid-area: 1 / 1` with `margin-inline-end: var(--space-0-7)`, `.poll-option-text` `grid-area: 1 / 2`, `.poll-option-submit` `grid-area: 1 / 3` with `margin-inline-start: var(--space-0-7); justify-self: end; align-self: center`, primary colours `var(--button-primary-bg)` / `var(--button-primary-fg)`, `border-radius: var(--radius-control)`, `min-height: 2.75rem`; move the existing `.poll-option > span`, `strong`, `small` rules to `.poll-option-text`; update the Sepia and Eco selectors that target `.poll-option input` / `.poll-option.selected` so they still match (research R1)

**Checkpoint**: US1 works at all widths with the full text button; tests T004/T005 pass

---

## Phase 4: User Story 2 - Keyboard and screen reader use (Priority: P2)

**Goal**: Tab reaches the row button from the selected radio, focus stays on the voted option after success, failures
are announced inside the row

**Independent Test**: Keyboard only: arrow to an option, Tab, Enter → one vote, focus on the voted radio; on failure
the alert is inside the row

### Tests for User Story 2

- [X] T009 [P] [US2] Add tests to `frontend/src/features/polls/PollRoutes.integration.test.tsx`: arrow keys between radios send no request; `userEvent.tab()` from the selected radio focuses its submit button; after a successful submit via Enter the focused element is the voted radio and the `role="status"` region contains the vote feedback once; on a failed vote a `role="alert"` exists inside `.poll-option.selected`, none below the option list, the button is enabled again and focused when the submit was made via keyboard, and selecting another option removes the alert
- [X] T010 [P] [US2] Add a keyboard-only e2e test to `frontend/e2e/app-shell.spec.ts`: focus the radio group, ArrowDown, Tab, Enter; assert one vote `POST`, focus on the voted radio, and an axe scan without violations while an option with the button is selected

### Implementation for User Story 2

- [X] T011 [US2] In `PollOptionRow.tsx` render `error` as `<p className="form-error poll-option-error" role="alert">{t(error.messageKey)}</p>` after the button (`.poll-option-error { grid-row: 2; grid-column: 1 / -1 }` in `styles.css`) (research R1, R4)
- [X] T012 [US2] In `PollPage.tsx` pass `error = mutationError` only to the selected row, delete the list-level `{mutationError && <p className="form-error" role="alert">…}`, and clear `mutationError` in the radio `onSelect` handler (FR-009)
- [X] T013 [US2] In `PollPage.tsx` record in `onMutate` whether `document.activeElement` is inside the form (ref `focusInFormOnSubmit`, data-model.md); after a successful vote focus the checked radio once the button has unmounted; after a failed vote focus the selected row's `.poll-option-submit` once the fieldset is enabled again; reset the ref afterwards (FR-008, FR-009, research R4)

**Checkpoint**: US1 and US2 pass independently

---

## Phase 5: User Story 3 - Fits on small screens (Priority: P3)

**Goal**: Icon-only button below 640px, text keeps its line count with "…", no row height change, no overflow

**Independent Test**: At 320px select the long option: icon button 44×44px at the end edge, row height unchanged,
text ends with "…", no horizontal scroll

### Tests for User Story 3

- [X] T014 [P] [US3] Add e2e tests to `frontend/e2e/app-shell.spec.ts`: at 375px `.poll-option-submit-text` is not visible and the icon is visible, button box ≥ 44×44px; at 768px the text is visible and the icon is not; for every option at 320/375/768/1024px the row height before and after selection differs by ≤ 1px (rows without a vote error, SC-006), including a long multi-line option; on a poll with 10 options at 375px, after scrolling any option into view and selecting it, its button is fully inside the viewport (SC-002); the long option's `.poll-option-text strong` has `scrollHeight > clientHeight` while selected and `scrollHeight <= clientHeight` again after another option is selected (FR-010); the button's top is above the bottom of the first text line's box (same visual row, never below the text); in all four themes no horizontal overflow, text and button boxes do not overlap, and the button text/icon contrast is ≥ 4.5:1 (existing contrast helper). **Closed in Phase 7 (T024, T028):** the 10-option check, the height check for every option row, and the 768px text check. Also covered: 375px icon and 1024px text, long-row height and line clamp, four-theme contrast/overflow at 320 and 768px, reduced motion
- [X] T015 [US3] After T014 (same file), add a reduced-motion e2e test to `frontend/e2e/app-shell.spec.ts`: with `reducedMotion: 'reduce'` the computed `transition-duration` / `animation-duration` of `.poll-option-submit` is ≤ 0.01s

### Implementation for User Story 3

- [X] T016 [US3] In `PollOptionRow.tsx` render, when `showSubmit`, `span.poll-option-ghost` (`aria-hidden="true"`) as a sibling after the `<label>` and the button, never inside the label (research R1), with `<strong>{option.text}</strong>` (a row with a button is never the current vote, so no `small`); observe it with `ResizeObserver` (guard `typeof ResizeObserver === 'undefined'`) and set the row style `--option-lines` to `Math.max(1, Math.round(ghostHeight / parseFloat(getComputedStyle(strong).lineHeight)))`; disconnect on unmount (research R3)
- [X] T017 [US3] In `frontend/src/app/styles.css`: `.poll-option-ghost { grid-column: 2 / 4; grid-row: 1; visibility: hidden; pointer-events: none }`; while `.poll-option` has a submit button (`:has(.poll-option-submit)`), `.poll-option-text` (already `grid-area: 1 / 2` from T008) gets `align-self: stretch; contain: block-size; overflow: hidden` (so only the ghost sets the row height, also before the first `ResizeObserver` callback) and its `strong` gets `display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: var(--option-lines); overflow: hidden` while keeping `overflow-wrap: anywhere` (research R3, FR-010)
- [X] T018 [US3] In `frontend/src/app/styles.css`: below 40rem `.poll-option-submit` is a `2.75rem` square with `padding: 0`, `.poll-option-submit-text` uses the existing `.sr-only` pattern and `.poll-option-submit-icon` shows; from `40rem` (`@media (min-width: 40rem)`) the icon is `display: none` and the text shows with `padding-inline: var(--space-4)`; `.poll-option-submit` gets `animation: poll-option-submit-in 150ms ease-out` with an opacity keyframe, covered by the global reduced-motion rule (research R2, R5, FR-006, FR-012)

**Checkpoint**: All three stories work independently

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T019 [P] Update `specs/004-frontend-ux-refinement/contracts/ui-contract.md` „Poll page“ bullets to point to `specs/005-inline-vote-button/contracts/ui-contract.md` for the submit button and vote error
- [X] T020 Search `frontend/src` and `frontend/e2e` for remaining list-level submit or vote-error selectors (`.poll-vote-form-wrapper > .primary-button`, `name: 'Stimme abgeben'` with exact matching) and update them
- [X] T021 Run `pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm test:e2e` in `frontend/`; all green
- [ ] T022 Walk through `specs/005-inline-vote-button/quickstart.md` steps 1–9 in all four themes at 320, 375, 768 and 1024px (manual)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none
- **Foundational (Phase 2)**: after Setup; blocks all stories
- **US1 (Phase 3)**: after Foundational
- **US2 (Phase 4)**: after Foundational; T011–T013 build on the row and `PollPage` wiring of T006–T007
- **US3 (Phase 5)**: after Foundational; T016–T018 need the button from T006 and the grid from T008
- **Polish (Phase 6)**: after the stories you ship

### Within Each User Story

- Tests first, expected to fail before implementation
- `PollOptionRow.tsx` before `PollPage.tsx` wiring before `styles.css` checks in the browser

### Parallel Opportunities

- T002 runs in parallel with T003
- Test tasks of a story ([P]) run in parallel with each other (different files)
- T019 runs in parallel with any implementation task

---

## Parallel Example: User Story 1

```text
Task: "T004 [US1] Vitest cases in frontend/src/features/polls/PollRoutes.integration.test.tsx"
Task: "T005 [US1] Playwright vote flows in frontend/e2e/app-shell.spec.ts and profile.spec.ts"
```

## Parallel Example: User Story 3

```text
Task: "T014 [US3] Layout e2e tests in frontend/e2e/app-shell.spec.ts"
Task: "T016 [US3] Ghost measurement in frontend/src/features/polls/PollOptionRow.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 and 2
2. Phase 3 (US1): button inside the selected row, list-level button removed
3. **Stop and validate**: T004/T005 green, vote works on desktop

### Incremental Delivery

1. MVP (US1)
2. US2: keyboard, focus and inline error
3. US3: icon on phones, line clamp, stable height
4. Polish: contracts, selector sweep, full test run, manual walkthrough

---

## Notes

- [P] tasks = different files, no dependencies
- Commit after each task or logical group only when the user asks

## Phase 7: Convergence

- [X] T023 Add a three-option integration test in `frontend/src/features/polls/PollRoutes.integration.test.tsx` that moves the confirm button from option B's row to option C's row, and assert no confirm button on an expired poll with an identity per US1/AC2 and the "Poll not active" edge case (partial)
- [X] T024 Extend the layout checks in `frontend/e2e/app-shell.spec.ts` to every option row at 320, 375, 768 and 1024px: height unchanged on selection (rows with a vote error excluded), text shown in full again after deselecting (no "…"), and the button's top above the bottom of the first text line per FR-010 and SC-006 (partial)
- [X] T025 Extend the keyboard flow in `frontend/e2e/app-shell.spec.ts` (`sets the identity and casts a vote using only the keyboard`): ArrowDown to select, assert that Tab focuses the confirm button, Enter casts exactly one vote, focus returns to the voted radio, and an axe scan runs with the selected option per US2/AC1, US2/AC4, SC-003 and SC-005 (partial)
- [X] T026 Add an integration test in `frontend/src/features/polls/PollRoutes.integration.test.tsx` that Tab from the checked radio focuses its confirm button, using DOM order or fireEvent since `@testing-library/user-event` is not installed, and that the `role="status"` element holds the vote feedback exactly once after a keyboard submit per US2/AC1 and FR-008 (partial)
- [X] T027 Add a 1024px assertion to the `places the confirm button at the end of the selected row` test in `frontend/e2e/app-shell.spec.ts` that the button's right edge is within the row's content box end plus 1px per FR-001 (partial)
- [X] T028 Add to `frontend/e2e/app-shell.spec.ts` a 10-option poll check at 375px (the confirm button of any selected option is inside the viewport after scrolling it into view) per SC-002, a text/button overlap check at 320, 375, 768 and 1024px in all four themes per SC-004, and a 768px assertion that the text is visible and the icon hidden per FR-006 (partial)
- [X] T029 Replace the undefined `--space-0-4` in the `.poll-option-error` margin in `frontend/src/app/styles.css` with a defined spacing token, or define `--space-0-4` in `:root` following the extended naming rule, per the design token contract in `specs/004-frontend-ux-refinement/contracts/ui-contract.md` (partial)
- [X] T030 Add a dark-theme hover rule for `.poll-option-submit` in `frontend/src/app/styles.css` mirroring `:root[data-theme='dark'] .primary-button:not(:disabled):hover`, so the row button lightens on hover like the other primary buttons per FR-011 (partial)

## Phase 8: Convergence

- [X] T031 Move focus to the checked radio after every successful vote in `frontend/src/features/polls/PollPage.tsx` (remove the `focusInFormOnSubmit` condition), add an integration test in `frontend/src/features/polls/PollRoutes.integration.test.tsx` that a vote whose button had no focus still focuses the voted option, and update the focus decision in `specs/005-inline-vote-button/research.md` (R4) to match per FR-008 and US2/AC4 (partial)
- [X] T032 Add an integration test in `frontend/src/features/polls/PollRoutes.integration.test.tsx` for a late results update that changes the current vote while option B is selected: B stays selected, its confirm button stays visible, and the vote is not sent, per the edge case "A late update of the current vote arrives while the person has a different option selected" (partial)
- [X] T033 Add a check to `frontend/e2e/app-shell.spec.ts` that the row confirm button's background has at least 3:1 non-text contrast against the selected row's background in all four themes, per US3/AC2 "stays distinguishable from the selected option's background" (partial). **Done:** the 2.50:1 reading in Dunkel was a measurement artifact. The button's 150ms background transition was still showing the light theme's blue (#0066cc, which gives 2.50:1 against the dark row) when the test read it right after the theme switch. The test now waits for transitions to settle, and with the existing dark primary colour all four themes pass 3:1. No design change was made; the lighter-button option was not applied.

## Phase 9: Convergence

- [X] T034 Update `specs/005-inline-vote-button/contracts/ui-contract.md` (the "After success" line in the poll page section) and `specs/005-inline-vote-button/data-model.md` (the `focusInFormOnSubmit` paragraph) so that focus after a successful vote always moves to the voted radio, and `focusInFormOnSubmit` only decides focus after a failed vote, per FR-008 and T031 (partial)
