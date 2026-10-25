# UI Contract: Inline Vote Button

Observable behaviour that tests may rely on. Extends
`specs/004-frontend-ux-refinement/contracts/ui-contract.md`; where they differ, this file wins.

## Texts (i18n keys, `translations.ts`)

| Key | de | en | Use |
|---|---|---|---|
| `polls.submitVote` | Stimme abgeben | Cast vote | Visible button text from 640px (unchanged key) |
| `polls.submitVoteFor` | Stimme abgeben: {option} | Cast vote: {option} | Accessible name of the row button |

## Poll page (`/poll/:id`), replaces the spec 004 "Submit" bullet

- Each option is a `.poll-option` row containing a `<label>` with the radio and the option text. The radios form one
  group; selecting sends **no** request.
- The submit button (`button[type=submit].poll-option-submit`) exists only inside the selected row, and only when the
  poll is active, the identity can vote and the selection differs from the current vote (or while that vote is
  sending). There is never more than one on the page and none below the option list.
- The button is never inside the `<label>`; it follows the radio in DOM and Tab order.
- Accessible name: `polls.submitVoteFor` with the option text. Below 640px only a check-mark icon is visible
  (2.75rem × 2.75rem); from 640px the text `polls.submitVote` is visible and the icon is not.
- Position: the button's end edge aligns with the row's content end edge, on the same line as the start of the
  option text (never below it).
- The hidden measuring copy (`.poll-option-ghost`, `aria-hidden`) is never inside the `<label>`.
- While sending: `aria-busy="true"`, `disabled`, spinner instead of icon, fieldset disabled. Exactly one `castVote`
  request per activation.
- After success: no button; focus always moves to the voted radio (FR-008); one `role="status"` message.
- On failure: `p.poll-option-error[role="alert"]` inside the selected row, below text and button; the button is
  enabled again and, if focus was in the form, focused. Selecting another option removes the error. No vote error
  is rendered below the list.
- While the button is shown, the row height equals its height without the button (±1px, rows with a vote error
  excluded); overflowing text ends with "…". The full text stays in the radio's and the button's accessible names and is shown without "…" again as soon
  as the row has no button.

## Motion

| Element | Duration | Reduced motion |
|---|---|---|
| Row button appear | 150ms opacity | ≈ 0 |
