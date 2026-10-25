# Quickstart: Validate the Frontend UX Refactoring

## Prerequisites

Toolchain and backend start as documented in the [README](../../README.md). Frontend commands run
in `frontend/`.

## Automated checks

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
```

Expected: all green. `pnpm test` uses `frontend/src/test/setup.ts` (matchMedia stub); a
`TypeError: window.matchMedia is not a function` means the setup file is not registered.
Relevant suites:

| Suite | Covers |
|---|---|
| `src/features/polls/pollListState` tests / `PollsPage.test.tsx` | `all` default, URL canonicalization, filter empty state + reset (US2) |
| `PollPage.test.tsx`, `PollRoutes.integration.test.tsx` | identity notice above options, disabled fieldset, inline editor, poll title `h1`, no option number, „Endet am“, plural (US1, US4, US6) |
| `HomePage.test.tsx` | hidden `h1`, single identity card / CTA, featured poll not repeated (US1, US4) |
| `App.test.tsx` | menu button, panel open/close/Escape, single navigation landmark (US3, US7) |
| `pollFormatters.test.ts` | `formatVoteCount` for 0, 1, n in de/en (US6) |
| `e2e/app-shell.spec.ts` | 375×812 header height ≤ 80px, no overflow, menu → identity dialog → confirm, axe (landmarks, link names, text contrast) without critical/serious violations, touch targets, vote flow without identity, radio border contrast ≥ 3:1 per theme, metadata panel without fill/shadow (US1, US3, US4, US7) |
| `ResultsPages.test.tsx` | „1 Stimme“ / „n Stimmen“ on results and option pages (US6) |

## Manual pass

Seed: one active public poll created before today, no identity cookie.

1. Desktop, theme Hell: open `/polls` → poll visible, filter shows „Alle“. Choose „Morgen“ →
   empty state names „Morgen“ and offers „Filter zurücksetzen“ → poll visible again.
2. Open the poll → `h1` is the poll title; notice + „Identität festlegen“ above disabled
   options. Set an identity, confirm → options enabled; vote → feedback; „1 Stimme“ in metadata.
3. Start page → no visible generic heading, one identity card (none after setting the identity,
   only the compact sidebar status); featured poll not repeated in the latest list.
4. Resize to 375×812 → one header bar, nothing truncated; menu opens with navigation and
   identity status; Escape closes and focuses the menu button. On `/` without identity the menu
   has no edit button. On `/polls`: „Identität bearbeiten“ closes the menu, opens the dialog,
   confirm step inside the dialog, identity changes. With the menu open, widen the window to
   ≥ 900px → panel disappears, sidebar navigation visible.
5. Repeat 1–4 in Dunkel, Sepia and Eco: badge, links vs. buttons, radio indicators readable;
   metadata panel has no fill or shadow.
6. Open results and option pages of a poll with exactly one vote → „1 Stimme“.
7. German UI: audit page title and admin vote removal dialog say „Prüfprotokoll“.
8. Screen reader / accessibility tree: one „Hauptnavigation“, poll card links read title + state.
