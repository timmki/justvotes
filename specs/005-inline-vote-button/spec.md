# Feature Specification: Inline Vote Button

**Feature Branch**: `005-inline-vote-button`

**Created**: 2026-10-19

**Status**: Draft

**Input**: User description: "Ich möchte, dass der Knopf zur Bestätigung einer gewählten Option bei einem Poll rechts auf der jeweiligen Option erscheint, wenn man sie auswählt."

## Clarifications

### Session 2026-10-19

- Q: How should the confirm button look on narrow phones (320–375px)? → A: Full text "Stimme abgeben" from 640px
  width upwards; below 640px a compact check-mark icon button whose accessible name stays "Stimme abgeben: <option>".
- Q: Where should the error message appear when sending a vote fails? → A: Inside the selected option, directly below
  its text and button.
- Q: May the selected option's row change size when the button appears? → A: Room for the button is made only on the
  selected option, but its text does not wrap onto extra lines; text that no longer fits is cut off with an ellipsis
  ("…"), so the row keeps its height.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Confirm the vote on the chosen option (Priority: P1)

A person with an identity opens an active poll and taps one of the options. A "Stimme abgeben" button appears at
the right edge of exactly that option. The person confirms right where they made the choice, without moving to a
button below the list. If they pick a different option, the button moves to the new one.

**Why this priority**: This is the whole feature. Today the confirm button sits below the option list, apart from
the choice it confirms; on long lists it can be off screen.

**Independent Test**: Open an active poll with an identity, select an option, and check that the confirm button
is shown inside that option at its right edge and nowhere else; activate it and check that the vote is recorded.

**Acceptance Scenarios**:

1. **Given** an active poll, an identity and no vote yet, **When** the person selects option B, **Then** a confirm
   button appears at the right edge of option B and no other option or place on the page shows a confirm button.
2. **Given** option B is selected with the button shown, **When** the person selects option C, **Then** the button
   disappears from B and appears at the right edge of C.
3. **Given** the button is shown on option C, **When** the person activates it, **Then** exactly one vote for C is
   sent, the button shows a busy state while sending, and afterwards C is marked as the person's vote and no
   confirm button is shown.
4. **Given** the person has already voted for A, **When** the page loads, **Then** no confirm button is shown; **When**
   they select B, **Then** the button appears on B; **When** they select A again, **Then** the button disappears.

---

### User Story 2 - Keyboard and screen reader use (Priority: P2)

A person using only the keyboard or a screen reader moves through the options with the arrow keys, reaches the
confirm button of the selected option with Tab, and confirms with Enter or Space.

**Why this priority**: The voting control must stay usable without a pointer; moving the button into the option
must not break the radio group.

**Independent Test**: Using only the keyboard, select an option with the arrow keys, press Tab, and check that
focus lands on the confirm button of the selected option and that Enter casts the vote.

**Acceptance Scenarios**:

1. **Given** focus on the selected option, **When** the person presses Tab, **Then** focus moves to that option's
   confirm button.
2. **Given** focus on an option, **When** the person presses the arrow keys, **Then** the selection moves between
   options as before and no vote is sent.
3. **Given** a screen reader on the confirm button, **When** it is announced, **Then** the name says which option
   is being confirmed (for example "Stimme abgeben: Option B").
4. **Given** the vote was sent from the confirm button, **When** the button disappears, **Then** focus stays on the
   voted option instead of being lost.

---

### User Story 3 - Fits on small screens (Priority: P3)

On a 320px wide phone the option text and the confirm button share the row without overlapping or causing
horizontal scrolling.

**Why this priority**: Most votes are cast on phones; the inline placement must not crowd long option texts.

**Independent Test**: At 320px width, select an option with a long text and check that the row keeps its height,
the text is cut off with "…", the button stays fully visible at the right edge, and the page does not scroll
sideways.

**Acceptance Scenarios**:

1. **Given** a 320px viewport and an option with a long text, **When** it is selected, **Then** the button is shown
   as a compact check-mark icon at the right edge, at least 44×44px, the text keeps its number of lines and is cut
   off with "…" where it no longer fits, and nothing overlaps.
2. **Given** a viewport of 640px or wider, **When** an option is selected, **Then** the button shows the full text
   "Stimme abgeben".
3. **Given** any supported theme, **When** the button is shown, **Then** its text or icon contrast is at least 4.5:1 against
   its background and it stays distinguishable from the selected option's background.

### Edge Cases

- No identity on an active poll: options stay disabled and no confirm button appears; the existing notice and
  identity action remain.
- Poll not active (closed, not started): no confirm button appears on any option.
- Sending fails: the selection and the button on that option stay, an error message is shown inside that option
  below its text and button, the button is usable again and keeps focus if it had it. Selecting another option
  removes the error.
- Selection changes while a vote is being sent: not possible, options are locked while sending.
- A late update of the current vote arrives while the person has a different option selected: the selection and
  its button are kept.
- Reduced motion: the button appears and moves without animation.
- Very long option text on the selected option: only the visible text is shortened with "…"; screen readers and the
  unselected state still get the full text.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The poll page MUST show the vote confirm button inside the currently selected option, aligned to the
  option's right edge.
- **FR-002**: The confirm button MUST be shown only when the poll is active, the person can vote and the selected
  option differs from their current vote; otherwise no confirm button is shown.
- **FR-003**: At most one confirm button MUST exist on the page at any time; the separate confirm button below the
  option list MUST be removed.
- **FR-004**: Selecting an option MUST NOT send a vote; only activating the confirm button sends exactly one vote.
- **FR-005**: While a vote is being sent, the button MUST show a busy state, be disabled, and all options MUST be
  locked.
- **FR-006**: From 640px width upwards the confirm button MUST show the visible text "Stimme abgeben" / "Cast vote";
  below 640px it MUST show a compact check-mark icon instead. At every width its accessible name MUST be
  "Stimme abgeben: <option text>" / "Cast vote: <option text>".
- **FR-007**: The options MUST stay one radio group; arrow keys move the selection, and the confirm button MUST be
  reachable with Tab directly after the selected option.
- **FR-008**: After a successful vote, focus MUST move to the voted option and the existing status announcement
  MUST still be made once.
- **FR-009**: On a failed vote, the selection and the button MUST remain, the error MUST be shown as an alert inside
  the selected option directly below its text and button (not below the option list), and the button MUST become
  usable again. If focus was in the vote form, it MUST return to that button. Selecting a different option MUST
  remove the error.
- **FR-010**: Room for the button MUST be made only on the selected option. The selected option's text MUST keep the
  number of lines it had before selection; text that no longer fits MUST be cut off with an ellipsis ("…") instead of
  wrapping, so the row height does not change. The full option text MUST stay available in the button's accessible
  name, and the text MUST be shown in full again once the option is no longer selected or the button disappears.
  At widths from 320px upwards text and button MUST NOT overlap, the button MUST have a target size of at least
  44×44px, and the page MUST NOT scroll horizontally.
- **FR-011**: The button MUST use the existing primary button colours of the active theme and meet a text or icon
  contrast of at least 4.5:1 in all four themes.
- **FR-012**: The button's appearance MUST respect the reduced-motion setting.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100% of checks, selecting any option of an active poll shows exactly one confirm button, located in
  that option.
- **SC-002**: A person can cast a vote with two actions (select, confirm) without scrolling, on every option of a
  poll with up to 10 options at 375px width.
- **SC-003**: A keyboard-only user can cast a vote using only arrow keys, Tab and Enter, in at most 4 key presses
  after focusing the option group.
- **SC-004**: No horizontal scrolling and no overlap of option text and button at 320, 375, 768 and 1024px in all
  four themes.
- **SC-006**: Selecting or deselecting an option changes the height of no option row by more than 1px at any of these
  widths. Excluded: a row whose vote error appears or is removed (FR-009).
- **SC-005**: Zero automated accessibility violations on the poll page with a selected option.

## Assumptions

- "Rechts auf der jeweiligen Option" means inside the option row at its right edge, not floating outside the list.
- The visible label stays "Stimme abgeben" from 640px upwards; the icon-only variant is used only below 640px.
- All other behaviour from spec 004 (explicit submit, identity notice, status announcement) stays unchanged; this
  feature moves the button and the vote error into the selected option.
- The existing option row styling and the theme's primary button colour tokens are reused.
