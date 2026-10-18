# Quickstart: Validate the Frontend UX Refinement

## Prerequisites

Toolchain and backend start as documented in the [README](../../README.md). Frontend commands
run in `frontend/`. For the manual checks, have at least one active public poll with an end
date and several options (one with a long label), and start without an identity.

## Automated checks

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
```

Expected: all green.

| Suite | Covers |
|---|---|
| `PollPage.test.tsx`, `PollRoutes.integration.test.tsx` | selection sends nothing, submit sends once, submit disabled for none/same selection, pending and error states, fact line (with/without end date, 0/1/n votes), focus + status after identity save (US1, US2) |
| `HomePage.test.tsx`, `App.test.tsx` | identity labels per state in card, sidebar and mobile menu (also on `/`), menu backdrop/Escape/focus return/Tab wrap (US1, US3) |
| `IdentityEditor` tests (in existing suites) | `onSaved` only on success; heading label per state (US1) |
| `e2e/app-shell.spec.ts` | contrast per theme (primary text ≥ 4.5:1, focus ring ≥ 3:1), arrow keys create 0 vote requests, scroll lock, 320px no overflow, 375px fact line above the fold, reduced-motion durations, no fixed blue on admin focus rings in Sepia/Eco (US1–US5) |

Adapted existing e2e tests: vote flow uses "Stimme abgeben" and no longer re-submits the same
option; failed vote keeps the selection ([research R1](research.md#r1-explicit-vote-submission)).

## Manual validation

1. **Labels (SC-001)**: without identity, check start page, sidebar (≥ 900px) and mobile menu
   (375px, also on `/`): all say "Identität festlegen". Set an identity: all say
   "Identität ändern".
2. **Voting (SC-004)**: open the active poll, Tab to the options, press ↓ through all options:
   the network panel shows no vote request. Press "Stimme abgeben": one request, button shows
   a spinner while pending.
3. **Identity on the poll page (SC-005)**: without identity, a screen reader on an option
   reads the notice text. Set the identity in the notice: focus lands on the first option and
   "Identität gesetzt. Du kannst jetzt abstimmen." is announced once.
4. **Fact line (SC-003)**: at 375×812 the title, status, end date, vote count and
   "Identität festlegen" are visible without scrolling; no subtitle, no date in the card.
5. **Menu (SC-007)**: at 375px open the menu: backdrop visible, page does not scroll; close via
   backdrop, Escape, ×, nav link.
6. **Themes (SC-002, SC-008)**: switch through Hell, Dunkel, Sepia, Eco: primary button and
   focus ring use the theme's link colour, also on `/admin`.
7. **Layout (SC-006)**: start page has no gap above the identity card; stats stack at 375px;
   a 120+ character title wraps as `h1` and clamps to three lines on cards.
8. **Motion (SC-009)**: with the OS setting "reduce motion" on, menu and button changes are
   instant.

See [contracts/ui-contract.md](contracts/ui-contract.md) for the exact DOM/ARIA expectations
and [data-model.md](data-model.md) for the state models.
