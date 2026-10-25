# Research: Inline Vote Button

All Technical Context items were known; no NEEDS CLARIFICATION remained. The decisions below settle the open design
points.

## R1 Option row markup

**Decision**: Each option becomes `div.poll-option` (row container, keeps the `selected` / `current` classes) with
three children in a CSS grid of columns `auto minmax(0, 1fr) auto`. Only the gap between radio and text is a
`column-gap`-like spacing (`margin-inline-end` on the radio); the space before the button is the button's own
`margin-inline-start`, so an empty third column adds no width (see R3). Every child gets an explicit row and column;
nothing relies on auto-placement, because the ghost of R3 occupies row 1, columns 2–3, and an item with only a column
would be auto-placed into the next free row:

1. `label.poll-option-label` with `display: contents`, containing the native radio (`grid-area: 1 / 1`) and the text
   block `span.poll-option-text` (`grid-area: 1 / 2`);
2. the submit button (`grid-area: 1 / 3`, only when shown);
3. the ghost text of R3 (`grid-row: 1; grid-column: 2 / 4`, only when the button is shown), a sibling after the
   label so it is not part of the label's click target or accessible name;
4. the inline error (`grid-row: 2; grid-column: 1 / -1`, only after a failure).

Overlapping explicitly placed items (text, button and ghost in row 1) is allowed in CSS grid; the ghost is
`visibility: hidden`, so only text and button are seen, side by side.

**Rationale**: HTML forbids a `<button>` inside a `<label>` (a label may only contain its own labelable control),
and clicks on a nested button would also be ambiguous. `display: contents` keeps the whole text clickable as part
of the label while the row grid places text and button side by side. DOM order radio → button gives the Tab order
the spec needs: from the selected radio, Tab reaches its button, because the other radios of the group are skipped.

**Alternatives considered**: Button inside the label with `preventDefault` (invalid HTML, axe
`nested-interactive`); absolutely positioned button over the row (overlap risk on narrow screens, breaks the grid
flow for the inline error).

## R2 Button visibility, label and icon

**Decision**: The row renders the button only when `submitEnabled && selected` (the existing spec 004 condition:
active poll, can vote, selection ≠ current vote) or while that row's vote is pending. It is `type="submit"` in the
existing form, so Enter on the button submits once. `aria-label` = `polls.submitVoteFor` with `{option}` replaced
(`Stimme abgeben: {option}` / `Cast vote: {option}`). Content: an inline SVG check mark (`aria-hidden`) and a
`span.poll-option-submit-text` with `polls.submitVote`. Below 40rem the text span is visually hidden and the button is
a 2.75rem square; from 40rem the icon is hidden and the text shows. Busy state keeps `aria-busy` and the existing
`.button-spinner`, which replaces the icon while pending.

**Rationale**: Reusing `submitEnabled` keeps one source of truth for "can confirm"; 40rem matches the existing 640px
breakpoint. A fixed accessible name across widths avoids a screen reader difference between phone and desktop.

**Alternatives considered**: Separate `.primary-button` modifier only (would inherit full-width/min-width rules that
do not fit the row); `title` attribute for the icon (not reliably announced, not shown on touch).

## R3 Keeping the line count

**Decision**: While the button is shown, the row also renders `span.poll-option-ghost` (`aria-hidden`,
`visibility: hidden`, sibling after the label, see R1) with the same text and font, placed in `grid-column: 2 / 4`,
row 1 — the width the text had
without the button. Because the grid has no `column-gap` and the button carries its spacing as
`margin-inline-start`, columns 2–3 with the button present are exactly as wide as column 2 without it, so the ghost
wraps exactly like the unselected text. The ghost alone sets the row height: the visible text block gets
`contain: block-size` and `align-self: stretch`, so its own content does not count toward the row height and it is
stretched to the ghost's height, with `overflow: hidden`. Its `strong` uses `display: -webkit-box`,
`-webkit-box-orient: vertical` and `-webkit-line-clamp: var(--option-lines)`. A `ResizeObserver` on the ghost sets
`--option-lines` to `round(ghostHeight / lineHeight)` (minimum 1). Without `ResizeObserver` (jsdom), or before its
first callback, the variable stays unset and the text is clipped at the row height without an ellipsis; the height is
already correct.

**Rationale**: The ghost makes the "lines before selection" a layout fact rather than a remembered number, so it
stays right on resize and font changes. `contain: block-size` is what makes the ghost-defined height binding even in
the first frame; JavaScript only adds the ellipsis.

**Alternatives considered**: `column-gap` on the grid (the gap before an empty third column still counts, so the
ghost would be one gap wider than the unselected text and could wrap to fewer lines); measuring the text once before
selection (wrong after a resize while selected);
reserving button space on every row (rejected by clarification Q3); single-line `text-overflow: ellipsis` (would
shrink multi-line options and change row height).

## R4 Inline error and focus after voting

**Decision**: `mutationError` is passed to the row of the pending/selected option and rendered there as
`p.form-error.poll-option-error[role="alert"]`. Selecting another option clears `mutationError`. The list-level vote
error below the form is removed; the identity query error stays below the form. When a vote succeeds, the button
unmounts, and focus always moves to the checked radio (FR-008, convergence T031; the earlier "only if focus was inside
the form" rule did not meet FR-008 for votes sent without button focus). When a vote fails and focus was inside the
form, focus returns to the row's button once it is enabled again. "Focus was inside the form" is recorded in
`onMutate`, because the disabled fieldset drops focus from the button while sending. The existing `role="status"`
region keeps announcing the vote feedback once.

**Rationale**: Matches clarification Q2 and FR-008/FR-009. The button sits inside the fieldset, which is disabled
while sending, so focus would otherwise fall to `<body>` both after success and after failure.

**Alternatives considered**: Keeping the button rendered but hidden after success (would leave a focusable ghost
control and break "at most one button").

## R5 Motion

**Decision**: The button fades in over 150ms (`opacity`) when it mounts; no transition for moving between rows, since
the old button unmounts and the new one mounts. The global reduced-motion rule sets the duration to ≈ 0.

**Rationale**: Short, no layout animation, consistent with the spec 004 motion table.

**Alternatives considered**: Sliding the button between rows (layout animation, harder to keep under 200ms on long
lists).

## R6 Test strategy

**Decision**:

- Vitest (`PollRoutes.integration.test.tsx`): no button before selection; exactly one button after selection and it
  is inside the selected row; it moves on reselect; none when the selection equals the current vote, without
  identity, or on inactive polls; accessible name "Stimme abgeben: <option>"; one `castVote` per click; while sending
  the row button has `aria-busy="true"`, is disabled, shows the spinner and the radios are disabled; inline error
  inside the row and cleared on reselect; focus on the voted radio after success and on the row button after a
  failure; Tab from the selected radio
  reaches its button. Existing tests that click the list-level button switch to the row button.
- Playwright (`app-shell.spec.ts`): button's right edge within the row's right padding; icon-only below 640px and
  text from 640px; button and text share one visual row (button top < text bottom); row height stable (≤ 1px) on
  selection at 320/375/768/1024; text shown in full again after deselecting; no horizontal overflow and
  text/button no overlap in four themes; contrast ≥ 4.5:1 and axe clean with a selected option; reduced motion.
  `profile.spec.ts` vote flow uses the new button name.

**Rationale**: Unit tests cover behaviour and ARIA; layout facts (position, height, icon swap) need a real browser.

**Alternatives considered**: Visual snapshot tests (brittle across fonts and themes).
