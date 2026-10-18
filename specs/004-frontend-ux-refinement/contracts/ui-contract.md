# UI Contract: Frontend UX Refinement

Observable behaviour that tests may rely on. Extends `specs/003-frontend-ux-refactor/contracts/ui-contract.md`;
where they differ, this file wins.

## Texts (i18n keys, `translations.ts`)

| Key | de | en | Replaces |
|---|---|---|---|
| `common.identitySet` | Identität festlegen | Set identity | `polls.setIdentity` |
| `common.identityChange` | Identität ändern | Change identity | `common.identityEdit` |
| `polls.submitVote` | Stimme abgeben | Cast vote | — (legend `polls.vote` stays) |
| `polls.identitySavedCanVote` | Identität gesetzt. Du kannst jetzt abstimmen. | Identity set. You can vote now. | — |
| `polls.endsAt` | Endet am | Ends on | Fact line: the date follows the label in a `<time>` element |
| `common.pollDescription` | — | — | removed |

No visible text may contain "Identität bearbeiten" / "Edit identity".

## Poll page (`/poll/:id`)

- `h1` = poll title; directly followed by the fact line (`.poll-fact-line`): status badge,
  optional "Endet am …", vote count. Separators are `aria-hidden`.
- No subtitle; the voting card contains no creation date and no status badge.
- Without identity on an active poll: notice with text (`id` referenced by the fieldset's
  `aria-describedby`) and a primary button `common.identitySet`; fieldset `disabled`, visual
  opacity ≤ .5 and muted option text.
- Options: native `input[type=radio]` in one group. Changing the selection (click, tap, arrow
  keys, Space) sends **no** request.
- Submit: `button[type=submit]` with text `polls.submitVote` after the option list;
  `disabled` unless a selection differs from the current vote; while sending:
  `aria-busy="true"`, `disabled`, spinner, fieldset disabled. Exactly one `castVote` request
  per activation.
- After a successful identity save: focus on the checked radio or the first radio; one polite
  `role="status"` message `polls.identitySavedCanVote`.
- Vote error: selection kept, `role="alert"` message, submit enabled again.

## Identity action (everywhere)

Sidebar, mobile menu (every page including `/`), start page card, poll notice and identity
editor heading show `common.identitySet` without identity and `common.identityChange` with one.

## Start page (`/`)

- `h1` present but visually hidden; the intro section takes no layout space (first card starts
  at the regular main padding).
- Below 640px: stats one per row, label left, value right; no label wraps beyond two lines.

## Mobile menu (< 900px)

- Toggle: `aria-expanded`, `aria-controls="mobile-menu-panel"`, label `common.menu` /
  `common.closeMenu`.
- Open: panel visible, backdrop `.mobile-menu-backdrop` visible below the header,
  `<html>` has class `menu-open` (page does not scroll).
- Close via toggle, Escape, backdrop click or nav link; focus returns to the toggle (except
  after navigation). Tab/Shift+Tab cycle within toggle + panel.
- Resizing to ≥ 900px closes the menu and removes `menu-open`.
- Nav items and identity block share the same inline padding.

## Poll list (`/polls`)

Sort select, date select and "Filter zurücksetzen" share height ≥ 44px and
`--radius-control`. Card titles clamp at three lines; the card link's accessible name is the
full title.

## Design tokens

Required custom properties on `:root` and per theme (values in [research R2/R3](../research.md#r2-design-token-set)):
`--fg`, `--focus-ring`, `--button-primary-bg`, `--button-primary-fg`, `--control-accent`,
`--space-1`…`--space-6`, `--space-8`, `--radius-control`, `--radius-tile`, `--radius-card`,
`--radius-pill`, `--font-size-display`, `--font-size-featured`, `--font-size-card-title`,
`--font-size-meta`, `--font-size-eyebrow`, `--font-size-stat`.

Additional colour token for the always-dark result and option panels: `--panel-accent` (`#2997ff`) and
`--panel-accent-text` (`#64b5ff`), defined on `:root` so they apply to every theme; the panels themselves keep their
fixed dark surface.

Extended scale steps: spacing, radius and type values that no named token fits are defined on `:root` and named by
their rem value with `-` for the decimal point (e.g. `--space-0-7` = `.7rem`, `--radius-1-15` = `1.15rem`,
`--font-size-0-65` = `.65rem`). Whole-number values get a `-0` suffix so they never collide with the numbered steps
(e.g. `--space-2-0` = `2rem`, while `--space-2` stays `.5rem`). Documented exceptions that stay literal: `0`, `auto`, `50%` (circular shapes) and
fluid `clamp()` values for responsive headings and paddings.

`styles.css` contains no `#007aff`. Contrast: primary button text ≥ 4.5:1, focus ring ≥ 3:1
in `light`, `dark`, `claude`, `openai`.

## Motion

| Element | Duration | Reduced motion |
|---|---|---|
| Button press | 120ms | ≈ 0 |
| Primary hover | 150ms | ≈ 0 |
| Menu panel open / close | 180ms / 140ms | ≈ 0 |
| Backdrop | 180ms | ≈ 0 |
| Identity notice removal | 200ms | immediate unmount |
