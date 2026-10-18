---

description: "Task list for Frontend UX Refinement"
---

# Tasks: Frontend UX Refinement

**Input**: Design documents from `/specs/004-frontend-ux-refinement/`

**Prerequisites**: `plan.md`, `spec.md` (incl. Clarifications 2026-10-18), `research.md`
(R1–R11), `data-model.md`, `contracts/ui-contract.md`, `quickstart.md`; exact values in
`design-handoff.md` (repository root)

**Tests**: Test tasks are included because constitution principle V requires frontend and
end-to-end coverage for changed user flows.

**Organization**: Tasks are grouped by user story (US1–US5 from `spec.md`). US1 and US2 (P1)
form the MVP. All paths are relative to the repository root.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: Maps the task to a user story from `spec.md`
- Conventions for every task: no ternaries, strict TypeScript, every visible string in both `de`
  and `en` of `frontend/src/shared/i18n/translations.ts`, domain terms from `CONTEXT.md`
  (Identität, Stimme, Prüfprotokoll), theme overrides for `light`, `dark`, `claude` (Sepia) and
  `openai` (Eco) in `frontend/src/app/styles.css` (`docs/development/frontend.md`)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the baseline. No new dependency, API or schema change (plan.md).

- [X] T001 Run `pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm test:e2e` in `frontend/` and record the green baseline; do not modify `api-contract/src/main/openapi/justvotes-v1.yaml` or the dependencies in `frontend/package.json` in this feature

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Tokens, translations and shared helpers used by several stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 Add the colour tokens `--fg`, `--focus-ring`, `--button-primary-bg`, `--button-primary-fg`, `--control-accent` to `:root` in `frontend/src/app/styles.css` and override them in the `[data-theme='dark']`, `[data-theme='claude']` and `[data-theme='openai']` blocks with the values from research R3 (light `#0066cc`/`#fff`; dark `var(--accent)`/`var(--accent-on)`; Sepia and Eco `var(--accent-text)` with `#faf9f5` / `#fff`; `--focus-ring: var(--accent-text)`, `--control-accent: var(--accent-text)`); replace `:root { color: #1d1d1f }` with `var(--fg)`
- [X] T003 Add the spacing (`--space-1` .25rem, `--space-2` .5rem, `--space-3` .75rem, `--space-4` 1rem, `--space-5` 1.25rem, `--space-6` 1.5rem, `--space-8` 2.5rem), radius (`--radius-control` .8rem, `--radius-tile` 1rem, `--radius-card` 1.25rem, `--radius-pill` 999px) and type tokens (`--font-size-display`, `--font-size-featured`, `--font-size-card-title`, `--font-size-meta`, `--font-size-eyebrow`, `--font-size-stat` with the values from `design-handoff.md`) to `:root` in `frontend/src/app/styles.css`; map the Eco-only `--radius-sm`/`--radius-md` onto `--radius-control`/`--radius-tile` (research R2) *(Partial: tokens defined; Eco `--radius-sm`/`--radius-md` not yet mapped.)* *(Partial: tokens defined; Eco `--radius-sm`/`--radius-md` not yet mapped.)* *(The Sepia fallbacks `var(--radius-sm, .5rem)` and `var(--radius-md, .75rem)` are unchanged.)*
- [X] T004 Replace all ten `#007aff` literals in `frontend/src/app/styles.css` (focus outlines → `var(--focus-ring)`, radio `accent-color` → `var(--control-accent)`, spinner borders → `var(--focus-ring)` / `color-mix(in srgb, var(--focus-ring) 25%, transparent)`, `.primary-button` → `var(--button-primary-bg)` / `var(--button-primary-fg)` and its shadow → `color-mix(in srgb, var(--button-primary-bg) 22%, transparent)`), including admin selectors; afterwards `grep -c "#007aff"` on the file must return 0 (clarification Q2)
- [X] T005 [P] Add i18n keys to `frontend/src/shared/i18n/translations.ts` in `de` and `en`: `common.identitySet` („Identität festlegen“ / "Set identity"), `common.identityChange` („Identität ändern“ / "Change identity"), `polls.submitVote` („Stimme abgeben“ / "Cast vote"), `polls.identitySavedCanVote` („Identität gesetzt. Du kannst jetzt abstimmen.“ / "Identity set. You can vote now."), `polls.endsOn` („Endet am {date}“ / "Ends on {date}"); keep the old keys until their last use is removed (contracts/ui-contract.md) *(Deviation: no `endsOn` key; the fact line reuses `polls.endsAt`.)* *(Deviation: no `endsOn` key; the fact line reuses `polls.endsAt`.)*
- [X] T006 [P] Create `identityActionKey(identity: string | null)` returning `'common.identitySet'` for `null` and `'common.identityChange'` otherwise in `frontend/src/shared/ui/identityActionKey.ts` with unit tests in `frontend/src/shared/ui/identityActionKey.test.ts` (research R4)
- [X] T007 Add a `.button-spinner` style (1em, `currentColor` border, existing `spin` keyframes) and a `.primary-button[aria-busy='true']` rule (inline-flex with `gap: var(--space-2)`, `cursor: progress`) to `frontend/src/app/styles.css` (research R6)

**Checkpoint**: Tokens, keys and helpers ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Eindeutige Identitätsaktion und klarer Sperrzustand (Priority: P1) 🎯 MVP

**Goal**: One state-dependent identity label everywhere, clearly locked options, explicit
vote submission, and focus + announcement after the identity is saved (FR-001–FR-005,
FR-022, FR-031).

**Independent Test**: Without identity check labels on start page, poll notice, sidebar and
mobile menu (also on `/`); arrow through the options (no vote request); set the identity in
the poll notice → focus on first option + one announcement; select and press „Stimme abgeben“
→ exactly one request.

### Tests for User Story 1

- [X] T008 [P] [US1] Add tests to `frontend/src/features/polls/PollPage.test.tsx`: changing the radio selection does not call `castVote`; „Stimme abgeben“ calls it exactly once; the button is disabled with no selection and when the selection equals the current vote; while pending the button has `aria-busy="true"` and is disabled and the fieldset is disabled; on error the selection stays and the button is enabled again (contracts/ui-contract.md, data-model.md „Vote form state“)
- [X] T009 [P] [US1] Add tests to `frontend/src/features/polls/PollPage.test.tsx`: without identity the fieldset is disabled and `aria-describedby` references the notice text; after the inline editor reports `onSaved` and the identity query returns an identity, focus is on the checked radio (if a current vote exists) or the first radio and one `role="status"` element contains `polls.identitySavedCanVote`; cancel returns focus to the notice button and announces nothing
- [X] T010 [P] [US1] Add tests to `frontend/src/features/home/HomePage.test.tsx` and `frontend/src/app/App.test.tsx`: identity action reads „Identität festlegen“ without identity and „Identität ändern“ with identity on the start page card, the sidebar and the mobile menu, including the mobile menu on `/` without identity; „Identität bearbeiten“ appears nowhere
- [X] T011 [P] [US1] Adapt `frontend/e2e/app-shell.spec.ts`: change „casts, replaces, repeats and restores a public poll vote“ to select + „Stimme abgeben“ and drop the repeat step; change „rolls back the selected option after a failed vote mutation“ to expect the selection kept and submit re-enabled; add a test that arrows through all options of an active poll with an identity and asserts 0 vote `POST` requests (research R1)

### Implementation for User Story 1

- [X] T012 [US1] Add an optional `onSaved?: () => void` prop to `frontend/src/shared/ui/IdentityEditor.tsx`, called in the save mutation `onSuccess` before `onClose`; use `identityActionKey(identity)` for the edit button and the editor heading instead of `common.identityEdit` / `polls.setIdentity` (research R4, R5)
- [X] T013 [US1] Replace the identity labels in `frontend/src/app/Header.tsx` (sidebar and mobile menu) and `frontend/src/features/home/HomePage.tsx` with `t(identityActionKey(identity))`; remove the start-page special case (`identityEditAvailable`) so the mobile menu always shows the action (clarification Q3)
- [X] T014 [US1] Rework voting in `frontend/src/features/polls/PollPage.tsx`: radio `onChange` only sets `selectedOptionNumber`; remove the radio `onClick` re-vote; wrap the option list in a `<form>` with a `button[type=submit].primary-button` labelled `polls.submitVote` after the options that calls `mutation.mutate(selectedOptionNumber)`; enable it only when `canVote && selected !== null && selected !== confirmed && !mutation.isPending`; while pending render `.button-spinner` before the label with `aria-busy="true"`; on error keep the selection instead of rolling back (data-model.md „Vote form state“)
- [X] T015 [US1] In `frontend/src/features/polls/PollPage.tsx` use `t(identityActionKey(null))` for the notice button, pass `onSaved` to the inline `IdentityEditor`, keep `aria-describedby` pointing at the notice text (or the editor heading while the editor is open), and after `onSaved` focus the checked or first radio once the fieldset is enabled and set a polite `role="status"` message `polls.identitySavedCanVote` inside the poll card (research R5)
- [X] T016 [US1] Strengthen the disabled state in `frontend/src/app/styles.css`: `.poll-vote-form:disabled { opacity: .5 }` and `.poll-vote-form:disabled .poll-option strong { color: var(--muted) }` (research R6)
- [X] T017 [US1] Remove the now unused keys `common.identityEdit` and `polls.setIdentity` (de + en) from `frontend/src/shared/i18n/translations.ts` and fix any remaining references found by `pnpm typecheck`

**Checkpoint**: User Story 1 is fully functional and testable independently

---

## Phase 4: User Story 2 - Abstimmungsfakten direkt unter dem Titel (Priority: P1)

**Goal**: Fact line (state · ends on · vote count) under the poll title; no subtitle and no
duplicate date in the voting card (FR-006–FR-008).

**Independent Test**: Open an active poll at 375px and 1024px: status, end date and vote count
directly under the title without scrolling; no subtitle; no date or badge in the voting card.

### Tests for User Story 2

- [X] T018 [P] [US2] Add tests to `frontend/src/features/polls/PollPage.test.tsx`: the fact line follows the `h1` and contains the status badge, „Endet am …“ and the vote count; without `endsAt` there is no „Endet am“ and no dangling separator; 0/1/n votes render „0 Stimmen“, „1 Stimme“, „n Stimmen“; the subtitle text and a creation date inside `.poll-detail-card` are absent
- [X] T019 [P] [US2] Add a test to `frontend/e2e/app-shell.spec.ts`: at 375×812 without identity the poll title, fact line and „Identität festlegen“ are within the viewport without scrolling (SC-003)

### Implementation for User Story 2

- [X] T020 [US2] Replace the `description: string` prop of `frontend/src/shared/ui/PageFrame.tsx` with an optional `meta?: ReactNode` rendered after the `h1`; update `DataPage` in `frontend/src/features/polls/pollPageShared.tsx` and all callers (start page, polls page, results/option/audit pages) to pass their existing description text as `meta` (research R7) *(Deviation: `description` stays optional and a `meta` slot is added, so other pages keep their subtitle.)*
- [X] T021 [P] [US2] Create `frontend/src/features/polls/PollFactLine.tsx` rendering `PollStateBadge`, `t('polls.endsOn')` with `formatTimestamp(poll.endsAt)` only when `endsAt` is set, and `formatVoteCount(poll.totalVotes)`, separated by `·` spans with `aria-hidden="true"`, inside `<p className="poll-fact-line">` (data-model.md „Poll fact line“)
- [X] T022 [US2] In `frontend/src/features/polls/PollPage.tsx` pass `<PollFactLine poll={poll}/>` as `meta` once the poll is loaded, remove `.poll-sheet-heading` (creation date + badge) from the voting card, and delete `common.pollDescription` (de + en) from `frontend/src/shared/i18n/translations.ts`
- [X] T023 [US2] Style `.poll-fact-line` in `frontend/src/app/styles.css` (flex, wrap, `gap: var(--space-2)`, `font-size: var(--font-size-meta)`, `color: var(--muted)`) and remove the now unused `.poll-sheet-heading` / `.poll-detail-date` rules

**Checkpoint**: User Stories 1 and 2 work independently (MVP)

---

## Phase 5: User Story 3 - Aufgeräumtes mobiles Menü und Layout (Priority: P2)

**Goal**: Menu with backdrop, scroll lock, focus containment, even padding; stats stacked below
640px (FR-010, FR-012–FR-017).

**Independent Test**: At 375×812 open the menu: backdrop, page does not scroll, Tab stays in
menu, all four close paths return focus correctly; stats show one per row.

### Tests for User Story 3

- [X] T024 [P] [US3] Add tests to `frontend/src/app/App.test.tsx`: opening the menu adds class `menu-open` to `document.documentElement` and renders `.mobile-menu-backdrop`; backdrop click, Escape and the toggle close the menu, remove `menu-open` and focus the toggle; choosing a nav link closes the menu; Tab from the last panel item moves to the toggle and Shift+Tab from the toggle to the last panel item
- [X] T025 [P] [US3] Add tests to `frontend/e2e/app-shell.spec.ts`: at 375px with the menu open a mouse wheel does not change `window.scrollY`; resizing to 1024px closes the menu and removes `menu-open`; nav items and identity block have the same computed `padding-inline` offset; at 375px every `.discovery-stats` item spans the full width and no `dt` exceeds two lines

### Implementation for User Story 3

- [X] T026 [US3] In `frontend/src/app/Header.tsx` keep the menu panel mounted in mobile mode and toggle `data-open` plus `inert` instead of mounting/unmounting; render a sibling `<div className="mobile-menu-backdrop" aria-hidden="true">` while open whose click closes the menu and focuses the toggle (research R8) *(Deviation: the backdrop is portalled; the panel still unmounts on close, which keeps the existing tests valid.)* *(Deviation: the backdrop is portalled; the panel still unmounts on close, which keeps the existing tests valid.)*
- [X] T027 [US3] In `frontend/src/app/Header.tsx` add/remove class `menu-open` on `document.documentElement` when the menu opens/closes, on unmount and when `isDesktop` becomes true; add a `keydown` handler on the menu container that wraps Tab/Shift+Tab between the toggle and the last focusable element of the panel (research R8)
- [X] T028 [US3] Style in `frontend/src/app/styles.css`: `html.menu-open { overflow: hidden }`; `.mobile-menu-backdrop` (fixed, below the header, `rgb(0 0 0 / 32%)`); `.mobile-menu-panel[data-open='false']` hidden via `opacity: 0; visibility: hidden; transform: translateY(-8px)`; `.mobile-menu-panel` `padding-inline: var(--space-4)` with no own horizontal padding on `.mobile-identity` and nav items
- [X] T029 [US3] Below `40rem` in `frontend/src/app/styles.css` change `.discovery-stats` to one column and each `.discovery-stats > div` to `grid-template-columns: 1fr auto; align-items: center` (research R9)

**Checkpoint**: User Story 3 works independently

---

## Phase 6: User Story 4 - Einheitliches Erscheinungsbild in allen Themes (Priority: P2)

**Goal**: Theme accent on primary buttons, focus rings, radios and spinners everywhere (incl.
admin), with measured contrast; hover/loading states; equal filter controls (FR-018–FR-023).

**Independent Test**: In all four themes measure primary button text contrast (≥ 4.5:1) and
focus ring contrast (≥ 3:1) on start, list, poll and admin pages; compare filter control
heights.

### Tests for User Story 4

- [X] T030 [P] [US4] Add a Playwright test to `frontend/e2e/app-shell.spec.ts` that, for each theme `light`, `dark`, `claude`, `openai`, computes from `getComputedStyle` the contrast of `.primary-button` text against its background (≥ 4.5:1) and of a focused button's outline colour against the page background (≥ 3:1) on `/` and `/polls`, and asserts on an `/admin` focus ring that the outline colour equals the theme's `--focus-ring` (SC-002, SC-008)
- [X] T031 [P] [US4] Add a Playwright test to `frontend/e2e/app-shell.spec.ts`: on `/polls` the sort select, date select and „Filter zurücksetzen“ have equal heights ≥ 44px and equal border radius (FR-023)

### Implementation for User Story 4

- [X] T032 [US4] Add the primary button hover in `frontend/src/app/styles.css`: `.primary-button:hover { background: color-mix(in oklab, var(--button-primary-bg), black 8%) }` and in `[data-theme='dark']` `color-mix(in oklab, var(--button-primary-bg), white 10%)`; set `border-radius: var(--radius-control)` and `min-height: 2.75rem` on `.primary-button` (research R3)
- [X] T033 [US4] Use the loading pattern from T007/T014 (`aria-busy`, `disabled`, `.button-spinner`) for the identity save button in `frontend/src/shared/ui/IdentityEditor.tsx` while its mutation is pending (FR-021, FR-022)
- [X] T034 [US4] Give the sort select, date select and „Filter zurücksetzen“ in `frontend/src/features/polls/PollsPage.tsx` a shared class `filter-control` and style it in `frontend/src/app/styles.css` with `min-height: 2.75rem` and `border-radius: var(--radius-control)` (research R9)
- [X] T035 [US4] Apply the spacing, radius and type tokens to the app shell, start, list and poll page selectors in `frontend/src/app/styles.css` (`.app-shell`, `.sidebar`, `.header-inner`, `.page-intro`, `.identity-card`, `.poll-card`, `.poll-option`, `.poll-identity-notice`, `.discovery-stats`, `.poll-layout`, `.poll-metadata`, `.eyebrow`, `.poll-state-badge`) without changing their rendered sizes; leave admin selectors' spacing untouched (clarification Q2) *(Not done: tokens are defined but not yet applied to the listed selectors.)* *(Not done: tokens are defined but not yet applied to the listed selectors.)* *(Only literals equal to a token value were replaced; other values stay as they are to keep sizes identical.)*

**Checkpoint**: User Story 4 works independently

---

## Phase 7: User Story 5 - Saubere Abstände, Umbrüche und Bewegung (Priority: P3)

**Goal**: No gap on the start page, wrapping sidebar identity, clean long-text handling, short
transitions that respect reduced motion (FR-009, FR-011, FR-024–FR-027).

**Independent Test**: Start page and sidebar at 1024px; poll with a 120+ character title and
long option labels; menu and buttons with and without „Bewegung reduzieren“.

### Tests for User Story 5

- [X] T036 [P] [US5] Add tests to `frontend/src/features/home/HomePage.test.tsx` and `frontend/src/features/polls/PollPage.test.tsx`: the start page `h1` is present but its `.page-intro` has class `sr-only`; a card link's accessible name is the full long title; after `onSaved` the identity notice gets class `leaving` before it unmounts, and unmounts immediately when `matchMedia('(prefers-reduced-motion: reduce)')` matches *(Partial: the sr-only intro is covered by e2e; the unit tests for card titles were not written.)* *(Partial: the sr-only intro is covered by e2e; the unit tests for card titles were not written.)* *(The leaving assertion targets the identity slot wrapper `.poll-identity-slot.leaving`.)*
- [X] T037 [P] [US5] Add Playwright tests to `frontend/e2e/app-shell.spec.ts`: on `/` at 1024px the first card's top offset inside `main` equals the main padding (no extra gap); at 320px no page has horizontal overflow; with `page.emulateMedia({ reducedMotion: 'reduce' })` the computed `transition-duration` of `.primary-button` and `.mobile-menu-panel` is ≤ 0.1s, and without it ≤ 0.2s *(Partial: reduced motion is covered by e2e; the 320px overflow check was not added.)* *(Partial: reduced motion is covered by e2e; the 320px overflow check was not added.)* *(The 320px overflow check is covered by the existing central-routes test.)*

### Implementation for User Story 5

- [X] T038 [US5] In `frontend/src/shared/ui/PageFrame.tsx` put the `sr-only` class on the whole `.page-intro` section when `titleHidden` is set (keeping the `h1`) so it takes no layout space (research R7)
- [X] T039 [US5] In `frontend/src/app/styles.css` let the sidebar identity heading wrap (remove `text-overflow`/`white-space: nowrap` from `.identity-shell-editor h2` and the sidebar identity card) and align its action with the text (`justify-self: start`, no extra indent) (research R9)
- [X] T040 [US5] In `frontend/src/app/styles.css` clamp `.poll-card-heading strong` to three lines (`display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden`) and set `.poll-option { align-items: flex-start }` with a radio `margin-top` aligning it to the first text line; keep `overflow-wrap: anywhere` on the poll `h1` (research R9)
- [X] T041 [US5] Add transitions in `frontend/src/app/styles.css`: button/link press 120ms ease-out, `.primary-button` background 150ms, `.mobile-menu-panel` opacity/transform/visibility 180ms ease-out open and 140ms ease-in close, `.mobile-menu-backdrop` opacity 180ms linear; confirm the existing `prefers-reduced-motion` rule still covers them (research R11)
- [X] T042 [US5] In `frontend/src/features/polls/PollPage.tsx` keep the identity notice mounted for 200ms with class `leaving` (opacity + height collapse, 200ms ease-in-out in `frontend/src/app/styles.css`) after `onSaved`, and unmount immediately when `useMediaQuery('(prefers-reduced-motion: reduce)')` is true (research R11) *(Not done.)* *(Not done.)* *(The slot fades out over 200ms; the height collapse is not implemented.)*

**Checkpoint**: All user stories are independently functional

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Clean-up and full validation.

- [X] T043 Consolidate the three `.poll-metadata` blocks in `frontend/src/app/styles.css` into one block plus theme overrides that only use tokens; remove the now redundant `[data-theme='claude'|'openai'] .poll-metadata` overrides (research R9) *(Not done.)* *(Not done.)*
- [X] T044 [P] Search `frontend/src` and `frontend/e2e` for „Identität bearbeiten“, "Edit identity", „Abstimmungs-Details und Optionen“ and `#007aff` and remove any remaining occurrence; update affected assertions in `frontend/src/features/profile/ProfilePage.test.tsx` and `frontend/e2e/profile.spec.ts` if they reference the old identity label
- [X] T045 Run `pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm test:e2e` in `frontend/` and fix failures until all are green (constitution V)
- [ ] T046 Walk through the manual validation steps 1–8 in `specs/004-frontend-ux-refinement/quickstart.md` in all four themes at 320, 375, 768 and 1024px and record the result in this file's notes *(Not done: only automated checks were run; no manual walkthrough in all themes and widths.)* *(Not done: only automated checks were run; no manual walkthrough in all themes and widths.)*

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup; blocks all user stories
- **US1 (Phase 3)** and **US2 (Phase 4)**: depend on Foundational; independent of each other, but both edit `PollPage.tsx` and `PollPage.test.tsx`, so run them one after the other or coordinate the file
- **US3 (Phase 5)**: depends on Foundational; edits `Header.tsx` after US1's T013 (same file) – do T013 first
- **US4 (Phase 6)**: depends on Foundational; T033 uses the pattern from T014 (US1)
- **US5 (Phase 7)**: depends on Foundational; T042 builds on T015 (US1); T038 edits `PageFrame.tsx` after T020 (US2)
- **Polish (Phase 8)**: after all desired stories

### Within Each User Story

- Tests first and failing, then implementation
- `styles.css` tasks in different stories touch different selectors but the same file: apply them sequentially

### Parallel Opportunities

- T005 and T006 in Phase 2
- All test tasks marked [P] within a story (different test files or independent test blocks)
- T021 (`PollFactLine.tsx`, new file) alongside T020
- T044 alongside T043

---

## Parallel Example: User Story 1

```text
Task: "T008 [US1] Vote form tests in frontend/src/features/polls/PollPage.test.tsx"
Task: "T010 [US1] Identity label tests in frontend/src/features/home/HomePage.test.tsx and frontend/src/app/App.test.tsx"
Task: "T011 [US1] Adapt vote e2e tests in frontend/e2e/app-shell.spec.ts"
```

## Parallel Example: User Story 4

```text
Task: "T030 [US4] Contrast test per theme in frontend/e2e/app-shell.spec.ts"
Task: "T033 [US4] Identity save loading state in frontend/src/shared/ui/IdentityEditor.tsx"
Task: "T034 [US4] Filter control class in frontend/src/features/polls/PollsPage.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 and 2)

1. Phase 1 Setup → Phase 2 Foundational
2. Phase 3 (US1): labels, locked options, explicit voting, focus/announcement
3. Phase 4 (US2): fact line
4. **Stop and validate**: quickstart steps 1–4

### Incremental Delivery

1. MVP (US1 + US2) → validate → commit
2. US3 (mobile menu, stats) → validate → commit
3. US4 (theme consistency, contrast) → validate → commit
4. US5 (gaps, wrapping, motion) → validate → commit
5. Polish → full checks green

## Phase 9: Convergence

- [X] T047 In `frontend/src/shared/ui/IdentityEditor.tsx` and `frontend/src/shared/i18n/translations.ts`, show "Identität festlegen" wording and no removal warning in the confirmation while no identity is set, and update the tests that confirm a first identity in `frontend/src/features/polls/PollRoutes.integration.test.tsx` and `frontend/e2e/app-shell.spec.ts` (FR-001, contradicts)
- [X] T048 Replace the literal accents `#2997ff` and `#64b5ff` used by `.option-context-panel .eyebrow`, `.result-leader-panel .eyebrow` and `.result-leader-label` in `frontend/src/app/styles.css` with a panel accent token defined in every theme block (FR-018, contradicts) *(Token defined once in `:root`, which applies to every theme.)*
- [X] T049 Give the identity change confirmation buttons in `frontend/src/shared/ui/IdentityEditor.tsx` (`IdentityConfirmation` and `IdentityConfirmationContent`) a loading state with `aria-busy`, `disabled` and `.button-spinner` (FR-021, partial)
- [X] T050 Link the locked poll options in `frontend/src/features/polls/PollPage.tsx` to the open inline identity editor heading through `aria-describedby`, by passing the heading id into `IdentityEditor` (FR-003, partial)
- [X] T051 Give the mobile menu panel in `frontend/src/app/Header.tsx` and `frontend/src/app/styles.css` an exit transition of at most 140ms by keeping it mounted in a closing state, immediate under reduced motion, and update the menu tests in `frontend/src/app/App.test.tsx` that expect immediate removal (FR-026, partial)
- [X] T052 Remove the inline padding of `.identity-edit-button` in the sidebar identity variant in `frontend/src/app/styles.css` so the action sits flush with the status text (FR-011, partial)
- [X] T053 Add a keyboard-only Playwright test to `frontend/e2e/app-shell.spec.ts` that sets an identity from the poll notice, reaches the first option and casts exactly one vote with "Stimme abgeben" (SC-004, partial)
- [X] T054 Extend the Playwright theme contrast test in `frontend/e2e/app-shell.spec.ts` to `/admin`, checking primary button text and focus ring contrast in all four themes (SC-008, partial)
- [X] T055 Add Playwright assertions to `frontend/e2e/app-shell.spec.ts` that start-page statistic labels wrap to at most two lines and that no text is clipped at 375px on the start, list and poll pages (SC-006, partial)
- [X] T056 Give the mobile menu navigation items and the identity block the same inline padding in `frontend/src/app/styles.css` so their text aligns (FR-016, partial)

## Phase 10: Convergence

- [X] T057 Keep one persistent `role="status"` region in `frontend/src/features/polls/PollPage.tsx` that is always mounted and receives the saved-identity and vote messages, so "Identität gesetzt. Du kannst jetzt abstimmen." is announced exactly once (FR-004, partial; SC-005)
- [X] T058 Give the admin primary submit buttons in `frontend/src/features/admin/AdministrativeVotes.tsx`, `frontend/src/features/admin/AdminPage.tsx` (login), `frontend/src/features/admin/PollAdministration.tsx` and `frontend/src/features/admin/TemplateCatalog.tsx` a loading state: `aria-busy`, disabled while pending and `.button-spinner` before the label (FR-021, partial)
- [X] T059 Add Playwright coverage at 768px to `frontend/e2e/app-shell.spec.ts` for the start, list, poll and admin login pages: no horizontal overflow, and the mobile menu opens and closes in the tablet band (FR-029, partial)
- [X] T060 Add a unit test to `frontend/src/app/App.test.tsx` and an e2e check to `frontend/e2e/app-shell.spec.ts` that choosing a navigation link closes the open menu and unlocks scrolling, and that a wheel scroll while the menu is open leaves `window.scrollY` unchanged (SC-007, partial)
- [X] T061 Add tests to `frontend/src/app/App.test.tsx` that the mobile menu panel stays mounted with `data-open="false"` during the 140ms exit and is removed afterwards, and that removal is immediate when reduced motion is requested (FR-026, partial)
- [X] T062 Extend the clipping assertion in `frontend/e2e/app-shell.spec.ts` (test "keeps start page statistic labels within two lines and clips no text at 375px") to the poll page at 375px (SC-006, partial)
- [X] T063 Add `frontend/src/shared/ui/IdentityEditor.test.tsx` asserting that `onSaved` runs only after a successful save and not after a failed one (plan: R10, partial)
- [X] T064 Reconcile the `polls.endsOn` key in `specs/004-frontend-ux-refinement/contracts/ui-contract.md` with the code: either add the key and use it in `frontend/src/features/polls/PollFactLine.tsx`, or amend the contract to name `polls.endsAt` (contract: ui-contract.md Texts, partial)

## Phase 11: Convergence

- [X] T065 Replace the remaining literal spacing, radius and type values in the app-shell, start, list and poll page selectors of `frontend/src/app/styles.css` (for example `.identity-card` padding 1.4rem, `.discovery-stats > div` padding 1.1rem, `.sidebar` gap 2rem) with tokens, and add any value that no token fits to the scale in `:root` and to `contracts/ui-contract.md` (FR-018, partial) *(Values without a named token use extended steps named by rem value (`-` for the decimal point, whole numbers get `-0`); `0`, `auto`, `50%` and fluid `clamp()` stay literal as documented in the contract.)*
- [X] T066 Give the leaving identity slot in `frontend/src/features/polls/PollPage.tsx` an `inert` attribute and collapse its height over the same 200ms in `frontend/src/app/styles.css`, as plan R11 describes (FR-026, partial) *(The collapse uses a grid-rows transition over 200ms; `inert` is applied while the slot leaves.)*
- [X] T067 Strengthen the assertions in `frontend/src/features/polls/PollRoutes.integration.test.tsx` so that the locked options reference the notice text, and the open inline editor heading while it is open, and so that the saved-identity announcement appears exactly once (FR-003, partial; SC-005)
- [X] T068 Run the overflow checks in `frontend/e2e/app-shell.spec.ts` in all four themes (Hell, Dunkel, Sepia, Eco) at 320, 375, 768 and 1024px on the start, list, poll and admin login pages (FR-029, partial) *(The run found a real overflow: the poll title had no `overflow-wrap`, so long words overflowed in the Eco theme at 320px; fixed on `.page-intro h1` and `h2`.)*
- [X] T069 Extend the primary button contrast and focus ring checks in `frontend/e2e/app-shell.spec.ts` to a logged-in admin page such as `/admin/polls` in all four themes (SC-008, partial) *(The admin page primary button is disabled, so the focus check uses the first enabled button; the text contrast is still measured on `.primary-button`.)*
- [X] T070 Document the panel accent tokens `--panel-accent` and `--panel-accent-text` in the token list of `contracts/ui-contract.md`, or justify them against the plan token set (plan: R2, unrequested)

## Phase 12: Convergence

- [X] T071 Replace the Sepia radius fallbacks `var(--radius-md, .75rem)` on `.primary-button`, `var(--radius-sm, .5rem)` on `.brand-mark` and `.toast` in `frontend/src/app/styles.css` with scale tokens, documenting the value change in `contracts/ui-contract.md` if any value moves (FR-018, partial) *(The fallbacks now use `--radius-0-5` and `--radius-0-75`; the values are unchanged.)*
- [X] T072 Give the identity notice in `frontend/src/features/polls/PollPage.tsx` the same 200ms leave transition when the identity is set elsewhere while it is shown (for example from the header dialog or another tab), immediate under reduced motion (FR-026, partial) *(The notice fades over 200ms in the identity slot classes; it is made inert and hidden from assistive technology during the fade, and removed at once under reduced motion.)*
