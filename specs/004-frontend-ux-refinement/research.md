# Research: Frontend UX Refinement

All Technical Context items were known from the codebase; no `NEEDS CLARIFICATION` remained.
The decisions below resolve how each spec requirement is implemented.

## R1. Explicit vote submission

**Decision**: `PollPage.tsx` keeps a local `selectedOptionNumber` that the radio `onChange`
only updates. A new submit button "Stimme abgeben" (`polls.submitVote`) below the option list
calls the existing `useCastVoteMutation(...).mutate(selectedOptionNumber)`. The radio
`onClick` re-vote hack is removed. The button is enabled only when `canVote`, a selection
exists and `selectedOptionNumber !== confirmedOptionNumber`. While the mutation is pending the
fieldset stays disabled and the button shows the loading state (R6). On error the selection
stays as chosen (not rolled back) and the button becomes enabled again.

**Rationale**: Native radio groups move selection with the arrow keys, so `onChange` voting
casts one vote per key press and writes a domain event each time. Explicit submission matches
the clarification (Q1), keeps the HTTP contract and keeps one request per confirmed vote.

**Alternatives considered**: Roving tabindex with Space-to-vote (keeps instant voting but
breaks the native radio pattern and still has no loading anchor); debounce on `onChange`
(still casts accidental votes).

**Impact on tests**: The e2e test "casts, replaces, repeats and restores a public poll vote"
drops the "repeat" step (re-submitting the current option is no longer possible from the UI;
the "unchanged" vote status remains reachable through the API). "rolls back the selected
option after a failed vote mutation" changes to "keeps the selection and re-enables submit".

## R2. Design token set

**Decision**: Add custom properties to `:root` and override per theme in the existing
`[data-theme='dark'|'claude'|'openai']` blocks:

- Colour: `--fg`, `--focus-ring`, `--button-primary-bg`, `--button-primary-fg`,
  `--control-accent` (alongside existing `--surface`, `--raised`, `--separator*`, `--muted`,
  `--accent`, `--accent-text`, `--accent-on`, `--danger`, `--shadow`).
- Spacing: `--space-1` (.25rem) … `--space-6` (1.5rem), `--space-8` (2.5rem).
- Radius: `--radius-control` (.8rem), `--radius-tile` (1rem), `--radius-card` (1.25rem),
  `--radius-pill` (999px). The Eco-only `--radius-sm`/`--radius-md` are mapped onto these.
- Type: `--font-size-display`, `--font-size-featured`, `--font-size-card-title`,
  `--font-size-meta`, `--font-size-eyebrow`, `--font-size-stat` (values from
  `design-handoff.md`).

All ten `#007aff` literals (focus outlines, `.primary-button`, radio `accent-color`, spinner)
and the `#000` primary text are replaced across the whole stylesheet, admin selectors
included. Spacing/radius/type tokens are applied only to selectors of the app shell, start,
list and poll pages (clarification Q2).

**Rationale**: CSS custom properties are already the theming mechanism; no build step or
library needed.

**Alternatives considered**: CSS-in-JS or a token JSON pipeline (new dependency, out of
proportion); migrating admin spacing too (rejected by Q2).

## R3. Primary button colours and contrast per theme

**Decision**: `--button-primary-bg: var(--accent-text)` and `--button-primary-fg` per theme:

| Theme | bg | fg | Expected ratio |
|---|---|---|---|
| light | `#0066cc` | `#fff` | ≈ 5.6:1 |
| dark | `#2997ff` (`--accent`) | `#001b36` (`--accent-on`) | ≈ 6.6:1 |
| claude | `--accent-text` (`#c96442` mixed 18% black) | `#faf9f5` | ≈ 5:1, to be measured |
| openai | `#0a7a5e` | `#fff` | ≈ 5.3:1 |

Dark uses the brighter accent because `--accent-text` (`#64b5ff`) is meant for text on dark
surfaces. Hover: `color-mix(in oklab, var(--button-primary-bg), black 8%)` (light themes) and
`white 10%` (dark). `--focus-ring: var(--accent-text)`.

**Rationale**: Raw `--accent` with light text fails in Sepia (≈ 3.7:1) and Eco (≈ 3.2:1). The
Sepia value is computed by the browser from `color-mix`, so the Playwright contrast test (R10)
is the source of truth.

**Alternatives considered**: Black text on the bright accent (current; passes but diverges from
link colour per theme).

## R4. Identity action labels

**Decision**: New keys `common.identitySet` ("Identität festlegen" / "Set identity") and
`common.identityChange` ("Identität ändern" / "Change identity"); remove
`common.identityEdit` and `polls.setIdentity`. A small helper
`identityActionKey(identity: string | null)` in `shared/ui` returns the key and is used by
`IdentityEditor` (button and dialog heading), `Header` (sidebar and mobile menu),
`HomePage` and `PollPage`. The mobile menu always renders the action, on the start page too
(clarification Q3); the start-page special case in `Header.tsx` (`identityEditAvailable`) is
removed.

**Rationale**: One function guarantees SC-001 (no label drift) and is trivially unit-testable.

## R5. Focus and announcement after saving the identity

**Decision**: `IdentityEditor` gets an optional `onSaved()` called in the mutation
`onSuccess` before `onClose`. On the poll page, `onSaved` sets a `focusVotingOnNextRender`
flag; once the identity query has refetched and the fieldset is enabled, an effect focuses the
checked radio if a current vote exists, otherwise the first radio, and pushes
`polls.identitySavedCanVote` ("Identität gesetzt. Du kannst jetzt abstimmen.") into a
polite `role="status"` element inside the poll card. Cancel keeps the existing behaviour
(focus back to the notice button). On save failure nothing is announced; the editor keeps
focus on its error.

**Rationale**: Focus must wait for the refetch, otherwise the radios are still disabled and
`focus()` is a no-op. A local status region avoids the toast, which is reserved for transient
errors.

**Alternatives considered**: Global toast (visual noise, separate region); focusing the
fieldset legend (one extra Tab step, violates SC-004).

## R6. Loading and disabled states

**Decision**:

- Primary button loading: `aria-busy="true"`, `disabled`, inline spinner (`.button-spinner`,
  `currentColor`, 1em) before the unchanged label. Used by "Stimme abgeben" and the identity
  save button.
- Disabled options: `.poll-vote-form:disabled { opacity: .5 }` and option text in `--muted`.
  The existing `aria-describedby` on the fieldset (already pointing to the notice text) stays;
  it is now also kept while the inline editor is open, pointing to the editor heading.

**Rationale**: `opacity: .72` was too subtle; touch devices never show `not-allowed`.

## R7. Poll fact line and page frame

**Decision**: `PageFrame` replaces `description: string` with an optional `meta: ReactNode`
(start and list pages pass their existing description text as `meta`). `PollPage` passes
`<PollFactLine poll={poll}/>` rendering `PollStateBadge` · "Endet am {date}" (only if
`endsAt`) · `formatVoteCount(...)`, separated by `·` with `aria-hidden` separators. The
`.poll-sheet-heading` block (date + badge) is removed from the voting card;
`common.pollDescription` is deleted. With `titleHidden`, `.page-intro` itself gets the
`sr-only` class, which removes the ~70px gap on the start page.

**Rationale**: One slot covers both cases; hiding the whole intro section avoids margin leaks.

## R8. Mobile menu

**Decision** (`Header.tsx`, `styles.css`):

- Keep the panel mounted while the header is in mobile mode; toggle `data-open` and `inert`
  instead of mounting/unmounting, so open and close can transition (opacity + translateY
  −8px → 0, 180ms open / 140ms close).
- Backdrop: a sibling `<div class="mobile-menu-backdrop" aria-hidden="true">` below the panel
  (`rgb(0 0 0 / 32%)`, starts below the header), click closes the menu and returns focus to the
  toggle.
- Scroll lock: add `menu-open` class to `document.documentElement` (`overflow: hidden`) while
  open; removed on close, on unmount and when `isDesktop` turns true (existing effect).
- Focus containment: a `keydown` handler on the menu container wraps Tab/Shift+Tab between the
  toggle and the last focusable element in the panel.
- Padding: `.mobile-menu-panel` provides `padding-inline: var(--space-4)`; children have no
  own horizontal padding.

**Alternatives considered**: `<dialog>` element (changes landmark/disclosure semantics agreed in
spec 003); a focus-trap library (new dependency).

## R9. Layout fixes and edge cases

**Decision**:

- Stats below 640px: `.discovery-stats` becomes one column; each `div` uses
  `grid-template-columns: 1fr auto; align-items: center`.
- Sidebar identity: remove `text-overflow`/`white-space: nowrap` from the sidebar heading;
  align the action with `justify-self: start` and no extra indent.
- Filter bar: selects and `Filter zurücksetzen` share `min-height: 2.75rem` and
  `--radius-control`.
- Card titles: `display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; overflow: hidden`.
  The text stays in the DOM, so the link's accessible name remains the full title (no
  `aria-label` needed).
- Options: `.poll-option { align-items: flex-start }`, radio `margin-top` to align with the
  first line.
- Consolidate the three `.poll-metadata` blocks into one (plus theme overrides that only use
  tokens).

## R10. Test strategy

**Decision**:

- Vitest: vote form (selection does not call `castVote`; submit calls it once; disabled for
  no/same selection; pending state; error keeps selection), identity labels per state on all
  four places, focus + status after `onSaved`, fact line with and without `endsAt`, 0/1/n votes.
- Playwright (`app-shell.spec.ts`): contrast of primary button text and focus ring per theme
  computed from `getComputedStyle` (same helper approach as spec 003's radio contrast test);
  arrow-key traversal creates zero `POST` vote requests; menu backdrop click, Escape, scroll
  lock (`window.scrollY` unchanged after wheel), Tab containment; `emulateMedia({reducedMotion:
  'reduce'})` → computed `transition-duration` ≤ 0.1s; 320px no horizontal overflow; 375px
  fact line visible without scrolling; no `#007aff`-coloured focus ring in Sepia/Eco on an
  admin page.
- Existing tests asserting "Identität bearbeiten", the subtitle, instant voting or the 0.72
  opacity are updated.

## R11. Motion

**Decision**: Transitions only (no keyframes besides the existing spinner): button press
120ms ease-out, primary hover 150ms, menu 180/140ms, backdrop 180ms, identity notice
removal 200ms (notice gets a `leaving` class for 200ms before unmount; skipped when
`matchMedia('(prefers-reduced-motion: reduce)')` matches, read via `useMediaQuery`). The
existing global reduced-motion rule (`transition-duration: .01ms !important`) covers CSS.

**Rationale**: Keeps all durations within FR-026 (≤ 200ms) and reuses the global rule for
FR-027.
