---

description: "Task list for Frontend UX Refactoring"
---

# Tasks: Frontend UX Refactoring

**Input**: Design documents from `/specs/003-frontend-ux-refactor/`

**Prerequisites**: `plan.md`, `spec.md` (incl. Clarifications 2026-10-18), `research.md`
(R1–R17), `data-model.md`, `contracts/ui-contract.md`, `quickstart.md`

**Tests**: Test tasks are included because constitution principle V requires frontend and
end-to-end coverage for changed user flows.

**Organization**: Tasks are grouped by user story (US1–US7 from `spec.md`). US1–US3 (P1) form
the MVP. All paths are relative to the repository root.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: Maps the task to a user story from `spec.md`
- Conventions for every task: no ternaries, strict TypeScript, every visible string in both `de`
  and `en` of `frontend/src/shared/i18n/translations.ts`, domain terms from `CONTEXT.md`,
  theme overrides for `light`, `dark`, `claude` (Sepia) and `openai` (Eco) in
  `frontend/src/app/styles.css` (`docs/development/frontend.md`)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the baseline and prepare the test environment. No new dependency, API or
schema change (plan.md, research R2).

- [ ] T001 Run `pnpm typecheck`, `pnpm lint` and `pnpm test` in `frontend/` and record the green baseline; do not modify `api-contract/src/main/openapi/justvotes-v1.yaml` or the dependencies in `frontend/package.json` in this feature
- [ ] T002 Create `frontend/src/test/setup.ts` that installs a `window.matchMedia` stub when it is missing (`matches: false`, `media` = query, `addEventListener`/`removeEventListener`/`addListener`/`removeListener` no-ops, `dispatchEvent` returning `false`) and register it via `test.setupFiles: ['./src/test/setup.ts']` in `frontend/vitest.config.ts`; run `pnpm test` to confirm the baseline stays green (research R15)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared translations, formatters and components used by several stories.

**⚠️ CRITICAL**: Complete before the user story phases.

- [ ] T003 Add the new translation keys from `specs/003-frontend-ux-refactor/data-model.md` to `de` and `en` in `frontend/src/shared/i18n/translations.ts`: `polls.voteCountOne` (`{count} Stimme` / `{count} vote`), `polls.voteCountOther` (`{count} Stimmen` / `{count} votes`), `polls.endsAt` (`Endet am` / `Ends on`), `polls.setIdentity` (`Identität festlegen` / `Set identity`), `polls.allDates` (`Alle` / `All`), `polls.emptyForFilter` (`Keine Abstimmungen für „{filter}“` / `No polls for "{filter}"`), `common.menu` (`Menü` / `Menu`), `common.closeMenu` (`Menü schließen` / `Close menu`), `common.identityDialogTitle` (`Identität bearbeiten` / `Edit identity`); reword `polls.identityRequired` to `Lege eine Identität fest, um abzustimmen.` / `Set an identity to vote.`; keep old keys until their last usage is removed
- [ ] T004 [P] Add `formatVoteCount(count: number, locale: Locale, t)` to `frontend/src/features/polls/pollFormatters.ts` using `new Intl.PluralRules(locale).select(count)` to choose `polls.voteCountOne` or `polls.voteCountOther` and replacing `{count}` (research R9)
- [ ] T005 [P] Add tests for `formatVoteCount` with 0, 1 and 5 in `de` and `en` (expect `0 Stimmen`, `1 Stimme`, `5 Stimmen`, `0 votes`, `1 vote`, `5 votes`) in `frontend/src/features/polls/pollFormatters.test.ts`
- [ ] T006 [P] Create `frontend/src/features/polls/PollStateBadge.tsx` with props `state: Poll['state']` and optional `id: string`, rendering `<span className="poll-state-badge poll-state-badge--{state}">` with the label from `pollStateTranslationKey(state)` (data-model.md, research R8)
- [ ] T007 [P] Add an optional `action?: ReactNode` prop to `frontend/src/shared/ui/RouteState.tsx`, rendered after the text for `status="empty"`; existing callers stay unchanged (research R3)
- [ ] T008 [P] Add an optional `titleHidden?: boolean` prop to `frontend/src/shared/ui/PageFrame.tsx` that keeps `<h1 id="page-heading">` but gives it the `sr-only` class and omits the visible description (research R5)
- [ ] T009 [P] In `frontend/src/shared/ui/IdentityEditor.tsx`: (a) extract and export `IdentityStatus` with props `identity: string | null` and `identityState: 'ready' | 'loading' | 'error'` — non-null identity: "first 8 characters + „…“ if longer, full value in `title` and `aria-label`"; `null` + `ready` → `common.identityNotSet`; `null` + other → `common.identityNotLoaded`; use it in the editor's view mode (research R17); (b) add the props from data-model.md "IdentityEditor props": `startEditing` (default `false`; "opens in edit mode, input focused"), `onClose` ("called after cancel and after successful change") and `confirmation: 'dialog' | 'inline'` (default `dialog`; `inline` "renders the confirmation as a step inside the editor" instead of the `createPortal` dialog); (c) when `identity` is `null` and `variant` is `card`, render the edit button as `primary-button` labelled `polls.setIdentity`; validation, mutation and query invalidation stay unchanged (research R1, R10, R13)
- [ ] T010 Define the shared style rules in `frontend/src/app/styles.css` for all four themes: `.poll-state-badge` base + one modifier per lifecycle state (one shape, token-based colors replacing the separate `.poll-state`, `.poll-card-state` and `.featured-poll-card .poll-card-state` looks); `.text-link` as navigation link (underlined, link color, `display: inline-flex; align-items: center; min-height: 2.75rem` when standalone); `.text-button` restyled as a quiet action button (border or tinted background, no underline) (research R8, R10)

**Checkpoint**: Foundation ready; user stories can start.

---

## Phase 3: User Story 1 - Identität setzen und direkt abstimmen (Priority: P1) 🎯 MVP

**Goal**: A person without identity sets it in place on the poll page and votes without leaving
the page; the start page presents the identity card as primary action.

**Independent Test**: Without identity open an active poll, use „Identität festlegen“ above the
disabled options, confirm, vote; no navigation away from `/poll/:id`.

### Tests for User Story 1

- [ ] T011 [P] [US1] In `frontend/src/features/polls/PollRoutes.integration.test.tsx` add cases for an active public poll without identity: notice text `Lege eine Identität fest, um abzustimmen.` and button `Identität festlegen` render before the options; the vote `fieldset` is disabled and `aria-describedby` the notice; clicking the button shows the identity input with focus; cancel restores the notice and focuses the button; after a mocked successful `changeIdentity` the options are enabled; if the new identity already has a vote in this poll (mocked results contain it) that option is checked and marked `Deine Stimme`; if `changeIdentity` rejects, the error is shown in the editor and the `fieldset` stays disabled; for an expired poll no identity notice is shown
- [ ] T012 [P] [US1] In `frontend/src/features/home/HomePage.test.tsx` assert that without identity the identity card is rendered before the featured poll, its edit action is a `primary-button` labelled `Identität festlegen`, and with an identity set no full identity card is rendered on the start page

### Implementation for User Story 1

- [ ] T013 [US1] In `frontend/src/features/polls/PollPage.tsx` replace the bottom `polls.identityRequired` paragraph with a `.poll-identity-notice` at the top of `.poll-detail-card` (only when poll `state === 'active'`, identity query succeeded and identity is `null`) containing the text and a `primary-button` `polls.setIdentity`; local state `identityEditorOpen` swaps the notice for `<IdentityEditor identity={null} startEditing onClose={…}/>`; on cancel restore the notice and focus its button (data-model.md "Identity inline state")
- [ ] T014 [US1] In `frontend/src/features/polls/PollPage.tsx` set `aria-describedby` on `fieldset.poll-vote-form` to the notice id while the notice is shown; keep `disabled={!canVote || mutation.isPending}`
- [ ] T015 [US1] Style `.poll-identity-notice` and a clearly disabled option state (`.poll-vote-form:disabled .poll-option`: reduced opacity, `cursor: not-allowed`) for all four themes in `frontend/src/app/styles.css`
- [ ] T016 [US1] In `frontend/src/features/home/HomePage.tsx` render the full `IdentityEditor` card only while identity is `null`, placed before the discovery content as primary call to action (research R6; FR-005, FR-014)

**Checkpoint**: US1 works on its own; `pnpm test` green for the touched files.

---

## Phase 4: User Story 2 - Vorhandene Abstimmungen in der Liste finden (Priority: P1)

**Goal**: The poll list shows all public polls by default; empty filtered results name the
filter and offer a reset.

**Independent Test**: With an active public poll created before today open `/polls` → visible,
filter „Alle“; choose „Morgen“ → empty state names „Morgen“ → „Filter zurücksetzen“ shows the poll.

### Tests for User Story 2

- [ ] T017 [P] [US2] Replace the case `defaults to today and supports yesterday, tomorrow, and custom dates` in `frontend/src/features/polls/PollRoutes.integration.test.tsx` with: `/polls` shows polls from yesterday, today and tomorrow and the date select has value `all`; `date=today|yesterday|tomorrow` filter as before; `/polls?date=unknown` canonicalises to `/polls`; adjust the other `toHaveValue('today')` assertions (around lines 360–390) to the new default
- [ ] T018 [P] [US2] In `frontend/src/features/polls/PollsPage.test.tsx` add: filter `tomorrow` without matches shows `Keine Abstimmungen für „Morgen“` and a `Filter zurücksetzen` button in the empty state; clicking it sets the filter to `all`; with filter `all` and no polls the generic empty state has no reset button

### Implementation for User Story 2

- [ ] T019 [US2] In `frontend/src/features/polls/pollListState.ts` change `PollDateFilter` to `'all' | 'yesterday' | 'today' | 'tomorrow' | 'date'`, make `all` the parse default ("unknown values → `all`"; `from` or `to` without `date` param still implies `date`), omit only `all` in `serializePollListState` (write `date=today` etc. explicitly), extend `isDateFilter`, and return the sorted list unfiltered for `all` in `projectPollListState` (data-model.md "PollListState", contracts/ui-contract.md "URL contract")
- [ ] T020 [US2] In `frontend/src/features/polls/PollsPage.tsx` add `<option value="all">{t('polls.allDates')}</option>` as first date option; when the visible list is empty and `dateFilter !== 'all'`, render `RouteState status="empty"` with title `polls.emptyForFilter` (filter label inserted) and `action` = `text-button` `polls.resetFilters` calling `clearState`; keep the generic empty state for `all`

**Checkpoint**: US2 works on its own.

---

## Phase 5: User Story 3 - Kompakte Navigation auf kleinen Bildschirmen (Priority: P1)

**Goal**: Below 900px one compact header bar with brand, language, theme and menu button;
navigation and a read-only identity status live in a disclosure panel; editing opens a dialog.

**Independent Test**: At 375×812 the header is one bar ≤ 80px high without truncated text; the
menu exposes all navigation targets and the identity status; „Identität bearbeiten“ opens the
dialog and the change completes; Escape closes the menu and returns focus.

### Tests for User Story 3

- [ ] T021 [P] [US3] In `frontend/src/app/App.test.tsx` add: the header contains a button `Menü` with `aria-expanded="false"` and `aria-controls`; clicking opens a panel with the public navigation (`Startseite`, `Abstimmungen`, profile) and the identity status, and the panel contains no identity input; Escape closes it and focuses the button; clicking a link closes it; on `/polls` the panel's `Identität bearbeiten` closes the panel and opens a `dialog` named `Identität bearbeiten` with focused input, the confirmation step appears inside the same dialog, confirming calls `changeIdentity` once and closes the dialog with focus on the menu button; on `/` without identity the panel shows the status without an edit button; at most one `navigation` landmark named `Hauptnavigation` exists before and after opening; a test that overrides the `matchMedia` stub from `frontend/src/test/setup.ts` to report `matches: true` and fires `change` closes an open panel; update the admin assertions near lines 340–344 if their structure changes
- [ ] T022 [P] [US3] In `frontend/e2e/app-shell.spec.ts` update `keeps the public navigation reachable on a narrow viewport`, `does not stretch the compact identity bar on a narrow viewport`, `keeps the polls intro close to the mobile navigation` and the admin mobile navigation checks (around lines 715–735, `mobileNavigation`) to the menu panel; add a 375×812 check that `header.app-header` height is ≤ 80px, the `.sidebar` is not visible and brand text is not truncated (`scrollWidth <= clientWidth`); add a 1280px check that the menu button is hidden and `.sidebar-navigation` is visible; add a check that opens the menu at 375px, resizes to 1280px and expects `#mobile-menu-panel` to be gone and `.sidebar-navigation` visible; add a 375px flow menu → `Identität bearbeiten` → dialog → confirm that ends with the new identity shown in the menu status

### Implementation for User Story 3

- [ ] T023 [P] [US3] Create `frontend/src/shared/ui/IdentityDialog.tsx`: portal to `document.body`, `role="dialog"`, `aria-modal="true"`, `aria-labelledby` a heading `common.identityDialogTitle`, `useDialogFocusTrap` with `onClose` on Escape, rendering `<IdentityEditor identity={…} identityState={…} startEditing confirmation="inline" onClose={onClose}/>`; props `identity`, `identityState`, `onClose` (research R13)
- [ ] T024 [US3] In `frontend/src/app/Header.tsx` add a `useMediaQuery(query: string): boolean` hook that returns `false` "when `window.matchMedia` is unavailable" and updates on `change` events (data-model.md "Viewport state", research R15); add `menuOpen` state to `Header` and a menu `icon-button` (`aria-label` `common.menu`/`common.closeMenu`, `aria-expanded`, `aria-controls="mobile-menu-panel"`) shown only below 900px; set `menuOpen` to `false` when `useMediaQuery('(min-width: 900px)')` becomes `true`; render the brand link inside the header for narrow viewports
- [ ] T025 [US3] In `frontend/src/app/Header.tsx` render `#mobile-menu-panel` only while `menuOpen`, containing `ShellNavigation` (public or admin, from `useShellNavigation`) and `<IdentityStatus/>` (no editor); add a `text-button` `common.identityEdit` that sets `menuOpen=false` and `identityDialogOpen=true`, **not rendered when the route is `/` and identity is `null`**; render `IdentityDialog` while `identityDialogOpen` and return focus to the menu button when it closes; close the panel on Escape (focus the menu button), outside click and route change; opening the menu closes the theme menu and vice versa (data-model.md "Mobile menu state", research R4)
- [ ] T026 [US3] In `frontend/src/app/Header.tsx` remove the always-rendered `<ShellNavigation className="mobile-navigation" …/>` from `AppShell` and pass `identity` and `identityState` from `AppShell` to `Header`; rename the sidebar `aside` `aria-label` from `common.identity` to `common.appName`
- [ ] T027 [US3] In `frontend/src/app/styles.css` (`@media (max-width: 899px)` and theme blocks): hide `.sidebar` completely, drop the `.mobile-navigation` bar rules, style the menu button, `#mobile-menu-panel` (full width below the header, visible focus, ≥ 44px items) and the identity dialog (reuse `.modal-backdrop`/`.identity-dialog`), keep `.header-inner` single-row with no truncation, reduce `main` top padding so content starts directly below the header; update the `claude` and `openai` theme overrides that referenced `.mobile-navigation`

**Checkpoint**: MVP (US1–US3) complete; run `pnpm test` and `pnpm test:e2e`.

---

## Phase 6: User Story 4 - Klare Seitenhierarchie ohne Dopplungen (Priority: P2)

**Goal**: Poll title as only `h1`, no visible generic start page title, one identity card,
featured poll not repeated, metadata panel without fill or shadow.

**Independent Test**: On desktop check heading outline of `/` and `/poll/:id`, the number of
identity cards, that the featured poll appears once and the metadata panel's computed styles.

### Tests for User Story 4

- [ ] T028 [P] [US4] In `frontend/src/features/polls/PollRoutes.integration.test.tsx` assert that the poll page has exactly one `heading` level 1 with the poll title and no heading `Abstimmung` in the `complementary` metadata region
- [ ] T029 [P] [US4] In `frontend/src/features/home/HomePage.test.tsx` assert: the level-1 heading exists but has the `sr-only` class; with one active poll that is also newest the „Neueste öffentliche Abstimmungen“ section is absent; with several polls the featured poll is not in the latest list
- [ ] T030 [P] [US4] In `frontend/src/app/App.test.tsx` assert that on `/` without identity the sidebar shows no compact identity editor and with identity it shows it
- [ ] T031 [P] [US4] In `frontend/e2e/app-shell.spec.ts` assert on `/poll/:id` in all four themes that `.poll-metadata` has computed `box-shadow: none` and a `background-color` that is transparent (`rgba(0, 0, 0, 0)`) or equal to the computed page background (FR-016)

### Implementation for User Story 4

- [ ] T032 [US4] In `frontend/src/features/polls/PollPage.tsx` pass `poll.title` as `DataPage`/`PageFrame` title once loaded (fallback `polls.detail` while loading or on error), remove the `<h3>{poll.title}</h3>` from `.poll-sheet-heading` and the `<h3>{t('polls.detail')}</h3>` from `.poll-metadata` (research R5)
- [ ] T033 [US4] In `frontend/src/features/home/HomePage.tsx` use `PageFrame` with `titleHidden`; in `HomeDiscovery` exclude `featuredPoll.id` from the latest list and omit the whole `.discovery-preview` section when the remaining list is empty (research R7)
- [ ] T034 [US4] In `frontend/src/app/Header.tsx` (`AppShell`) hide the sidebar compact `IdentityEditor` on route `/` while identity is `null`; show it everywhere else and whenever an identity is set (FR-014)
- [ ] T035 [P] [US4] In `frontend/src/app/styles.css` set `.poll-metadata` to `background: transparent; box-shadow: none; border: 0` with at most a 1px `border-top` or `border-left` in `var(--separator-soft)` in all four themes, and remove conflicting theme overrides (research R14)

**Checkpoint**: US4 independently verifiable.

---

## Phase 7: User Story 5 - Einheitliche Status- und Bedienelemente (Priority: P3)

**Goal**: Same state badge everywhere, labelled vote counts, distinct link vs. action styles,
no card-in-card for the featured poll.

**Independent Test**: Compare featured poll, list cards, poll, results and option pages:
identical badge, „n Stimme(n)“ text, links look like links and actions like buttons.

### Tests for User Story 5

- [ ] T036 [P] [US5] In `frontend/src/features/polls/PollRoutes.integration.test.tsx` assert that list cards and the poll page render the state via `.poll-state-badge` and show the vote count as text (`1 Stimme`, `2 Stimmen`) without `.poll-vote-badge`
- [ ] T037 [P] [US5] In `frontend/src/features/polls/ResultsPages.test.tsx` assert that on the results page an option with one vote shows `1 Stimme` and an option with two votes `2 Stimmen` in `.result-option-meta`

### Implementation for User Story 5

- [ ] T038 [P] [US5] In `frontend/src/features/polls/PublicPollCard.tsx` replace `.poll-card-state` with `PollStateBadge` and the numeric `.poll-vote-badge` with a meta entry `formatVoteCount(poll.totalVotes, locale, t)` in `.poll-card-meta`
- [ ] T039 [US5] In `frontend/src/features/polls/PollPage.tsx` replace `<span className="poll-state">` with `PollStateBadge`; in the metadata use `formatVoteCount` for `polls.participation`; give the results/audit links in `.poll-detail-links` the `text-link` class
- [ ] T040 [P] [US5] In `frontend/src/features/polls/ResultsPages.tsx` replace `{option.voteCount} {t('polls.votes')}` in `.result-option-meta` with `formatVoteCount(option.voteCount, locale, t)` and use `PollStateBadge` wherever a lifecycle state is shown; keep `<dt>` labels (`polls.totalVotes`, `polls.votes`) as nouns; in `frontend/src/features/polls/AuditPage.tsx` use `PollStateBadge` where a state is shown (research R9 scope)
- [ ] T041 [P] [US5] In `frontend/src/features/home/HomePage.tsx` use `className="text-link"` for „Alle Abstimmungen anzeigen“ and the footer „Admin“ link
- [ ] T042 [US5] In `frontend/src/app/styles.css` remove the card styling of `.home-featured` (background, border, padding, shadow) so only the featured `PublicPollCard` is a card; delete now unused `.poll-vote-badge`, `.featured-poll-card .poll-vote-badge`, `.poll-card-state`, `.poll-state` and their theme overrides (around lines 1091–1110, 1676, 2082, 2275, 2627)

**Checkpoint**: US5 independently verifiable.

---

## Phase 8: User Story 6 - Verständliche Texte (Priority: P4)

**Goal**: Correct plurals, „Endet am“, no option number line on the poll page, „Prüfprotokoll“ in
all German texts and in the glossary.

**Independent Test**: Polls with 0/1/n votes, an end date, the audit page and the admin vote
removal dialog in `de` and `en`.

### Tests for User Story 6

- [ ] T043 [P] [US6] Update `frontend/src/features/polls/PollRoutes.integration.test.tsx`: remove the `Optionsnummer 7`/`Optionsnummer 2` expectations for the poll page (around lines 416–417) and assert no `Optionsnummer` text on the poll page while `Deine Stimme` still marks the current option; replace `Audit Log` with `Prüfprotokoll` (around lines 609, 713, 715, 884); assert the metadata label `Endet am`; the option-number line is removed only on the poll page, so the option-page `Optionsnummer` assertions (lines ~707, ~891) stay unchanged
- [ ] T044 [P] [US6] Update `frontend/e2e/app-shell.spec.ts`: `Audit Log` expectations (around lines 573–574) → `Prüfprotokoll`; adjust any assertion on `Audit-Kontext` or the vote removal warning text; e2e `0 %0 Stimmen` (around line 635) stays valid
- [ ] T045 [P] [US6] Search `frontend/src/**/*.test.tsx` (e.g. `AuditPage.test.tsx`, admin tests) for `Audit-Kontext`, `Audit Log` and `im Audit protokolliert` and update them to the new German texts

### Implementation for User Story 6

- [ ] T046 [US6] In `frontend/src/features/polls/PollPage.tsx` render under each option only `t('polls.yourVote')` when it is the current option (no `polls.optionNumber` line) and label the end date row with `polls.endsAt`
- [ ] T047 [US6] In `frontend/src/shared/i18n/translations.ts` (`de` only) set `audit.title` to `Prüfprotokoll`, `audit.context` to `Prüfprotokoll-Kontext` and `voteAdmin.removeVoteWarning` to `Die Entfernung wird unveränderlich im Prüfprotokoll festgehalten.`; verify that no other `de` value contains „Audit“; remove `polls.duration` and count usages of `polls.votes` that T038–T040 replaced (research R12, FR-024)
- [ ] T048 [P] [US6] Add the glossary entry **Prüfprotokoll** to `CONTEXT.md` after **Domänenereignis**, in the existing format: definition „Die chronologische, öffentlich lesbare Ansicht der Domänenereignisse eines Polls.“ and `_Avoid_: Audit Log, Audit` (research R16)

**Checkpoint**: US6 independently verifiable.

---

## Phase 9: User Story 7 - Barrierefreie Bedienung (Priority: P5)

**Goal**: ≥ 44px targets, ≥ 12px eyebrows, radio indicators with measured ≥ 3:1 contrast, unique
landmarks, clean card link names.

**Independent Test**: Measure targets/font sizes and radio contrast, run axe on `/`, `/polls`,
`/poll/:id` in all four themes, read card link names.

### Tests for User Story 7

- [ ] T049 [P] [US7] In `frontend/src/features/polls/PollRoutes.integration.test.tsx` assert the accessible name of a list card link equals `{title} {state label}` (space-separated, as produced by `aria-labelledby`, e.g. `Flamongo - Freitag Aktiv` with the actual state label) and does not include the date or „Erstellt von“
- [ ] T050 [P] [US7] In `frontend/e2e/app-shell.spec.ts` add a test that on `/`, `/polls` and `/poll/:id` at 375px and 1280px every visible element matching `main a, main button, header a, header button, .poll-option` — excluding inline links in running text (`main p a`, WCAG 2.5.8 inline exception) — has a bounding box ≥ 44×44, every `.eyebrow` has computed `font-size` ≥ 12px, a poll with a very long title (≥ 120 characters) causes no horizontal scroll at 375px, and the existing axe check runs for all four themes (`light`, `dark`, `claude`, `openai`) with no critical/serious violations including `landmark-unique`
- [ ] T051 [P] [US7] In `frontend/e2e/app-shell.spec.ts` add a test that for each theme (`light`, `dark`, `claude`, `openai`) opens `/poll/:id` with an identity, reads the computed `border-color` of `.poll-option input` and the resolved background color of its `.poll-option` (walking up ancestors while transparent), computes the WCAG contrast ratio and expects ≥ 3, once for an unselected and once for the selected option (`.poll-option.selected`) (SC-009)

### Implementation for User Story 7

- [ ] T052 [US7] In `frontend/src/features/polls/PublicPollCard.tsx` generate ids with `useId`, set `aria-labelledby` on the link to the title element id and the `PollStateBadge` id, and `aria-describedby` to the `.poll-card-meta` id (research R11)
- [ ] T053 [P] [US7] In `frontend/src/app/styles.css` set `.eyebrow`, `.identity-mini .eyebrow` and theme-specific eyebrow rules to `font-size` ≥ `0.75rem`
- [ ] T054 [P] [US7] In `frontend/src/app/styles.css` restyle `.poll-option input` with `appearance: none`, size `1.25rem`, `border: 2px solid var(--control-border)`, round shape, a checked dot via `::before` in `var(--accent)` and a visible `:focus-visible` outline; define `--control-border` per theme with ≥ 3:1 contrast against both the default and the `.selected` option background in `light`, `dark`, `claude` and `openai`; remove the hard-coded `accent-color: #007aff` and the theme overrides near lines 2654 and 2873 (research R11)
- [ ] T055 [P] [US7] In `frontend/src/app/styles.css` ensure `.section-head a`, `.home-footer a`, `.poll-detail-links a` and other standalone links on the three pages reach `min-height: 2.75rem` and a ≥ 44px hit area without changing visual text size

**Checkpoint**: All user stories complete.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [ ] T056 Search `frontend/src` for remaining usages of removed classes/keys (`poll-vote-badge`, `poll-card-state`, `poll-state"`, `mobile-navigation`, `polls.duration`, `polls.optionNumber` on the poll page) and delete dead CSS and translations in `frontend/src/app/styles.css` and `frontend/src/shared/i18n/translations.ts`
- [ ] T057 Run `pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm test:e2e` in `frontend/` and fix failures
- [ ] T058 Execute the manual pass in `specs/003-frontend-ux-refactor/quickstart.md` (desktop and 375×812, themes Hell, Dunkel, Sepia, Eco) and record results in `specs/003-frontend-ux-refactor/verification.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)** → user story phases → **Polish (Phase 10)**
- T002 blocks every test that renders `Header` (T021, T030); T003 blocks every task that renders
  new keys; T006 blocks T038–T040, T052; T007 blocks T020; T008 blocks T033; T009 blocks T013,
  T016, T023, T025; T010 blocks T039, T041, T042

### User Story Dependencies

- **US1 (P1)**: after Phase 2; independent
- **US2 (P1)**: after Phase 2; independent
- **US3 (P1)**: after Phase 2; independent (uses T009 `IdentityStatus` and `confirmation="inline"`)
- **US4 (P2)**: after Phase 2; T034 edits `Header.tsx` after T024–T026; T033 edits
  `HomePage.tsx` after T016
- **US5 (P3)**: after Phase 2; T039 edits `PollPage.tsx` after T013–T014 and T032
- **US6 (P4)**: T046 edits `PollPage.tsx` after T039; T047 after T038–T040; T048 independent
- **US7 (P5)**: T052 edits `PublicPollCard.tsx` after T038

### Shared-file hotspots (serialize edits)

- `frontend/src/features/polls/PollPage.tsx`: T013 → T014 → T032 → T039 → T046
- `frontend/src/app/Header.tsx`: T024 → T025 → T026 → T034
- `frontend/src/app/styles.css`: T010 → T015 → T027 → T035 → T042 → T053 → T054 → T055
- `frontend/src/features/polls/PollRoutes.integration.test.tsx`: T011 → T017 → T028 → T036 → T043 → T049
- `frontend/e2e/app-shell.spec.ts`: T022 → T031 → T044 → T050 → T051
- `frontend/src/app/App.test.tsx`: T021 → T030
- `frontend/src/features/home/HomePage.tsx`: T016 → T033 → T041
- `frontend/src/features/home/HomePage.test.tsx`: T012 → T029

### Parallel Opportunities

- Phase 2: T004, T005, T006, T007, T008, T009 in parallel (different files)
- After Phase 2: US1 (`PollPage.tsx`), US2 (`pollListState.ts`, `PollsPage.tsx`) and US3
  (`Header.tsx`, `IdentityDialog.tsx`) can run in parallel except for their `styles.css`,
  integration test and e2e edits
- T023 (`IdentityDialog.tsx`) in parallel with T024; T048 (`CONTEXT.md`) any time
- Test tasks marked [P] in different files can be written in parallel

---

## Parallel Example: Foundational + P1 stories

```bash
# Phase 2 in parallel:
Task: "formatVoteCount in frontend/src/features/polls/pollFormatters.ts"            # T004
Task: "PollStateBadge in frontend/src/features/polls/PollStateBadge.tsx"            # T006
Task: "RouteState action slot in frontend/src/shared/ui/RouteState.tsx"             # T007
Task: "PageFrame titleHidden in frontend/src/shared/ui/PageFrame.tsx"               # T008
Task: "IdentityStatus + editor props in frontend/src/shared/ui/IdentityEditor.tsx"  # T009

# P1 stories in parallel afterwards:
Task: "US1 inline identity in frontend/src/features/polls/PollPage.tsx"             # T013–T014
Task: "US2 'all' filter in frontend/src/features/polls/pollListState.ts"            # T019–T020
Task: "US3 identity dialog in frontend/src/shared/ui/IdentityDialog.tsx"            # T023
Task: "US3 mobile menu in frontend/src/app/Header.tsx"                              # T024–T026
```

---

## Implementation Strategy

### MVP First (US1–US3)

1. Phase 1 + Phase 2
2. US2 (smallest, highest visible bug), then US1, then US3
3. **STOP and VALIDATE**: `pnpm test`, `pnpm test:e2e`, quickstart steps 1, 2 and 4

### Incremental Delivery

1. MVP (US1–US3) → validate
2. US4 hierarchy → US5 consistency → US6 copy → US7 accessibility, validating after each
3. Polish + full quickstart pass in all four themes

---

## Notes

- [P] tasks = different files, no dependency on incomplete tasks
- Results and option pages are in scope for vote count formatting and the shared state badge;
  the „Optionsnummer“ line is only removed on the poll page
- Admin pages are only touched for the shared header/menu and the German „Prüfprotokoll“ text
- `refactor-frontend.md` in the repository root is left as is; delete it manually once the
  feature is merged if it is no longer needed
- Commit after each phase or logical group
