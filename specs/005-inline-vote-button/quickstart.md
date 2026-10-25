# Quickstart: Inline Vote Button

## Prerequisites

Backend and frontend running as described in the [README](../../README.md), with at least one active public poll that
has one long option text (≥ 80 characters) and three or more options.

## Automated checks

```bash
cd frontend && pnpm test
```

```bash
cd frontend && pnpm test:e2e
```

Expected: all green, including the inline-button cases listed in [research R6](research.md#r6-test-strategy).

## Manual validation

Check each step in all four themes at 320, 375, 768 and 1024px. Expected behaviour is in
[contracts/ui-contract.md](contracts/ui-contract.md).

1. Without an identity, open the poll: options are disabled and no confirm button exists.
2. Set an identity, select an option: one button appears at its right edge; icon only below 640px, text from 640px.
3. Select another option: the button moves; no row changes height; the long option shows "…" when selected.
4. With only the keyboard: arrow keys move the selection without voting; Tab reaches the button; Enter votes once.
5. A screen reader announces the button as "Stimme abgeben: <option>".
6. After the vote: the button is gone, focus is on the voted option, "Deine Stimme" is shown.
7. Select the current vote again: no button.
8. Stop the backend and vote with the keyboard: the error appears inside the selected option and focus is back on
   its button; selecting another option clears it.
9. With reduced motion enabled, the button appears without fading.
