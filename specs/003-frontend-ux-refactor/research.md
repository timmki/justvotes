# Research: Frontend UX Refactoring

All Technical Context items were known; the decisions below resolve the open design points of
`refactor-frontend.md` and the spec assumptions.

## R1 Inline-Identität auf der Abstimmungsseite

- **Decision**: Reuse `shared/ui/IdentityEditor.tsx` with two optional props: `startEditing`
  (opens directly in the edit state) and `onClose` (called after success or cancel). `PollPage`
  renders a notice (`polls.identityRequired`, rephrased without the home page reference) with a
  primary button at the top of the voting card; the button swaps the notice for the inline editor.
  The existing validation and confirmation dialog stay unchanged.
- **Rationale**: One editor implementation keeps validation, confirmation, error handling and the
  query invalidation (identity, identity votes, public polls, `['poll']`) in one place. The
  invalidation already refreshes `usePollResultsQuery`, so an existing vote of the new identity
  appears without extra code (spec edge case).
- **Alternatives considered**: A separate lightweight identity form (duplicates mutation and
  invalidation); a modal dialog (hides the poll options the person is about to vote on).

## R2 Filter „Alle“ ohne API-Änderung

- **Decision**: Add `'all'` to `PollDateFilter`, make it the parse default, omit it from the
  serialized URL (`/polls` = all) and serialize every other filter explicitly (`date=today`).
  `projectPollListState` returns the sorted list unfiltered for `all`.
- **Rationale**: `GET /polls` in `justvotes-v1.yaml` only has paging parameters; filtering is
  already client-side. A clean URL for the default keeps shared links short.
- **Alternatives considered**: Extending the API with a date parameter (no need, violates the
  "no unnecessary change" rule); keeping `today` as default with a hint (still hides polls).
- **Compatibility note**: Old links without `date` previously meant "today" and now mean "all".
  This is the intended fix; explicit `date=` links keep working.

## R3 Leerzustand mit aktivem Filter

- **Decision**: Extend `RouteState` with an optional `action?: ReactNode`. `PollsPage` passes a
  title naming the filter (e.g. „Keine Abstimmungen für „Heute““) and a reset button only when
  the filter is not `all`. For `all` the generic empty state stays.
- **Rationale**: Keeps one empty-state component; the domain-free slot fits `shared/ui`.
- **Alternatives considered**: A poll-specific empty state component (duplicates layout/icons).

## R4 Mobile Kopfzeile und Menü

- **Decision**: Below 900px the sidebar is hidden completely and the existing `Header` shows
  logo/app name, language button, theme menu and a new menu button. The button controls a
  disclosure panel (`aria-expanded`, `aria-controls`) below the header containing the public or
  admin navigation and a read-only identity status (no editor, clarification 2026-10-18). The
  status has an „Identität bearbeiten“ button that closes the panel and opens the identity dialog
  ([R13](#r13-identitätsdialog-aus-dem-mobilen-menü)); on `/` without identity the status shows
  „nicht gesetzt“ without the button. The panel closes on Escape (focus back to the
  button), outside click, route change and when `matchMedia('(min-width: 900px)')` starts
  matching. The panel is only rendered while open, so at most one navigation landmark with the
  name „Hauptnavigation“ exists in the accessibility tree at any time. Because the panel no
  longer hosts the editor, the outside-click close cannot interrupt the portal-based
  confirmation dialog (analysis finding U1).
- **Rationale**: Reuses the theme menu's proven close logic; the disclosure pattern is the
  WAI-ARIA recommendation for site navigation (an ARIA `menu` role would imply app-menu keyboard
  semantics). Removing the stacked sidebar bar and the separate mobile navigation bar meets the
  header height target.
- **Alternatives considered**: Bottom tab bar (spec assumption excludes it; conflicts with
  on-screen keyboards in the identity editor); distinct landmark labels only (fixes item 19 but not
  the height problem).

## R5 Seitentitel

- **Decision**: `PageFrame` gets an optional `titleHidden` flag that renders the `h1` with
  `sr-only` and drops the visible intro. `HomePage` uses it. `PollPage` passes `poll.title` as
  the `PageFrame` title once the poll is loaded (fallback `polls.detail` while loading/error) and
  removes the `h3` inside the voting card and the generic `h3` in the metadata panel.
- **Rationale**: Exactly one `h1` per page, generic headings disappear, screen readers still get a
  page heading on the start page.
- **Alternatives considered**: Removing the start page `h1` entirely (breaks heading navigation
  and the existing `page-heading` focus/label convention).

## R6 Identitätskarte nur einmal

- **Decision**: `HomePage` shows the full identity card only while no identity is set, with a
  primary-styled call to action. `AppShell` hides the sidebar compact status on `/` while no
  identity is set and shows it everywhere once an identity exists.
- **Rationale**: Satisfies FR-014 (one full card; compact status only with an identity) without
  removing the identity status from other pages.
- **Alternatives considered**: Always hiding the home card (loses the primary CTA of US1).

## R7 Featured Poll und Kartenverschachtelung

- **Decision**: `HomeDiscovery` excludes `featuredPoll.id` from the latest list and hides the
  section (heading and „Alle Abstimmungen anzeigen“ remain reachable via the featured area and
  navigation) when the remaining list is empty. `.home-featured` loses its card background/padding
  so the featured `PublicPollCard` is the only card.
- **Alternatives considered**: Hiding the section whenever the featured poll is the newest
  (inconsistent counts).

## R8 Status-Badge und Stimmenzahl

- **Decision**: New `features/polls/PollStateBadge.tsx` (`state: Poll['state']`) renders one
  `.poll-state-badge` with a modifier per lifecycle state (`active`, `expired`, `archived`, …),
  used in `PublicPollCard`, `PollPage` and any results/audit header that shows a state. The
  numeric badge in the card heading is replaced by a meta entry from `formatVoteCount`.
- **Rationale**: One component, one CSS rule set per theme; themes override only tokens.

## R9 Pluralisierung

- **Decision**: `formatVoteCount(count, locale, t)` in `features/polls/pollFormatters.ts` uses
  `new Intl.PluralRules(locale).select(count)` and the keys `polls.voteCountOne` /
  `polls.voteCountOther` (`{count}` placeholder replaced in the formatter). `I18nProvider` stays
  unchanged.
- **Scope** (clarification 2026-10-18): every rendered vote count on start page, poll list,
  poll page, results page (`result-option-meta` in `ResultsPages.tsx`) and option page. Labels
  that are column/term headings (`polls.totalVotes`, `polls.votes` as `<dt>`) stay as nouns.
  Admin pages are out of scope.
- **Rationale**: Locale-correct without adding an i18n library; scope limited to vote counts
  (the list count already has singular/plural keys).
- **Alternatives considered**: Generic interpolation/plural support in `t` (larger change for
  one use case).

## R10 Links vs. Aktionen

- **Decision**: `.text-link` = navigation (underlined, link color, inline-flex with
  `min-height: 2.75rem` when standalone); `.text-button` = actions, restyled as a quiet button
  (border or tinted background, no underline). `IdentityEditor` uses `.primary-button` when no
  identity is set (CTA) and `.text-button` otherwise. „Alle Abstimmungen anzeigen“ and „Admin“
  get `.text-link`.

## R11 Barrierefreiheit

- **Decision**:
  - Card link name: `aria-labelledby` pointing to the title and the state badge ids
    (`useId`), meta information via `aria-describedby`.
  - `.eyebrow` and `.identity-mini .eyebrow` ≥ `0.75rem` (12px).
  - Option radios: `1.25rem` size and a per-theme `--control-border` token with ≥ 3:1 contrast.
    Native radios with `accent-color` don't expose a measurable border color, so the radio gets
    `appearance: none` with an explicit `border` (and a checked dot via `::before`). A Playwright
    test sets each theme, reads `getComputedStyle` border color of `.poll-option input` and the
    resolved background of `.poll-option`, and computes the WCAG contrast ratio (≥ 3:1)
    (clarification 2026-10-18, SC-009). axe stays responsible for landmarks, link names and
    text contrast (SC-007).
  - Disabled options: rely on the disabled `fieldset` (native disabled state is exposed as
    unavailable), add `aria-describedby` to the identity notice and a visible disabled style
    (reduced opacity, `cursor: not-allowed`).
  - Touch targets ≥ 44px for standalone links and the menu button.
- **Rationale**: Native semantics first; ARIA only where names are composed.

## R12 Texte

- **Decision**: `polls.duration` → `polls.endsAt` („Endet am“ / „Ends on“); remove the
  `polls.optionNumber` line in `PollPage` (keep „Deine Stimme“ marker for the current option).
  Every German string containing „Audit“ uses „Prüfprotokoll“ (clarification 2026-10-18):
  `audit.title` → „Prüfprotokoll“, `audit.context` → „Prüfprotokoll-Kontext“,
  `voteAdmin.removeVoteWarning` → „Die Entfernung wird unveränderlich im Prüfprotokoll
  festgehalten.“; a final `grep -i audit` over the `de` block must only hit keys, not values.
  English texts stay. Remaining time is out of scope (spec assumption).

## R13 Identitätsdialog aus dem mobilen Menü

- **Decision**: New `shared/ui/IdentityDialog.tsx`: a modal (`role="dialog"`, `aria-modal`,
  `useDialogFocusTrap`, portal to `document.body`) that renders `IdentityEditor` with
  `startEditing` and `onClose`. In this mode `IdentityEditor` shows the confirmation as an
  inline step inside the same dialog (new prop `confirmation: 'dialog' | 'inline'`, default
  `dialog`) instead of a second portal. On close, focus returns to the menu button (the panel is
  already closed).
- **Rationale**: Two stacked `useDialogFocusTrap` instances both listen on `document`: Escape
  would close both and the outer trap would pull Tab focus out of the portal-based
  confirmation. An inline confirmation step keeps one dialog, one trap.
- **Alternatives considered**: Editor inside the menu panel kept open while editing (clarification
  chose against it); an `enabled` flag on the outer trap (requires lifting the editor's
  `confirmOpen` state out).

## R14 Leichter Metadatenbereich

- **Decision**: `.poll-metadata` gets `background: transparent`, `box-shadow: none`,
  `border: 0` and at most a 1px `border-top`/`border-left` in `--separator-soft`, in all four
  themes (clarification 2026-10-18, FR-016). A Playwright assertion checks computed
  `background-color` is transparent (or equals the page background) and `box-shadow` is `none`.

## R15 Viewport-Erkennung und Testumgebung

- **Decision**: The mobile menu closes on desktop width via a small hook
  `useMediaQuery('(min-width: 900px)')` in `frontend/src/app/Header.tsx` (or `shared/ui` if reused)
  that returns `false` when `typeof window.matchMedia !== 'function'`. In addition, a Vitest setup
  file `frontend/src/test/setup.ts` installs a `window.matchMedia` stub (`matches: false`,
  `addEventListener`/`removeEventListener` no-ops) and is registered via `test.setupFiles` in
  `frontend/vitest.config.ts`, so components and tests can rely on it (analysis finding U4).
- **Rationale**: jsdom does not implement `matchMedia`; without the guard every test that
  renders `Header` throws. The setup stub keeps future media-query code testable; the guard keeps
  the component robust in non-browser environments.
- **Alternatives considered**: Only a `resize` listener comparing `window.innerWidth` (works in
  jsdom but duplicates the CSS breakpoint logic); only the stub (component would still crash
  outside the test setup).

## R16 Glossarbegriff „Prüfprotokoll“

- **Decision**: Add „Prüfprotokoll“ to `CONTEXT.md` in the existing glossary format: the
  chronological, öffentlich lesbare Ansicht der Domänenereignisse eines Polls;
  _Avoid_: Audit Log, Audit (analysis finding T1).
- **Rationale**: The constitution binds visible domain terms to `CONTEXT.md`. The term becomes
  user-visible in this feature, so it needs a definition next to „Domänenereignis“.

## R17 Identitätsstatus im mobilen Menü

- **Decision**: Extract a small `IdentityStatus` component in
  `frontend/src/shared/ui/IdentityEditor.tsx` (exported alongside `IdentityEditor`) that renders
  the shortened identity label (`displayIdentity`, title attribute with the full value) or
  „nicht gesetzt“/„nicht geladen“. `IdentityEditor` and the menu panel both use it (analysis
  finding U5).
- **Rationale**: Keeps the label logic in one place instead of exporting a helper and
  duplicating JSX.
