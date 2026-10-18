# Frontend Refactoring Plan

Based on a design critique of the start page, poll list and poll detail page
(desktop and 375px mobile, no identity set, one active public poll).

## Priority 1 — Core flow

### 1. Make "set identity → vote" one visible flow
- `features/polls/PollPage.tsx`: move the identity hint from below the options to the top of
  the voting card, as a notice with an inline action that opens `shared/ui/IdentityEditor.tsx`
  in place (no "go to the start page" instruction).
- Render options as visibly disabled (and `aria-disabled`) until an identity is set.
- `features/home/HomePage.tsx`: present the identity card as the primary call to action while
  no identity is set.

### 2. Fix the default poll list filter
- `features/polls/pollListState.ts` defaults `dateFilter` to `'today'`, so an existing active
  poll is hidden ("0 öffentliche Abstimmungen").
- Add an `all` option to `PollDateFilter` and make it the default (check whether the API
  contract supports an unfiltered query; extend `justvotes-v1.yaml` if not).
- In the empty state, name the active filter and offer "Filter zurücksetzen" there.

### 3. Rebuild the mobile header
- `app/Header.tsx` / `app/App.tsx`: at small widths, three stacked bars take ~520 of 812px and
  truncate "JustVotes" and "Identität bearbeiten".
- Replace with one compact bar (logo, language, theme, menu button); move navigation into a
  menu or bottom tab bar and identity status into the page or menu.

## Priority 2 — Hierarchy and duplication

4. **Page titles**: on the poll page use the poll title as `h1` instead of the generic
   "Abstimmung"; drop or shrink the generic `h1` on the start page (the header already shows it).
   Remove the repeated "Abstimmung" heading in the metadata panel.
5. **Identity card shown twice** on desktop (sidebar and main): keep one; the sidebar may show
   a compact status once an identity exists.
6. **Featured poll repeated** in "Neueste öffentliche Abstimmungen": exclude it, or hide the
   section when it would only repeat the featured poll.
7. **Metadata panel**: use a light panel style so it no longer outweighs the voting card.

## Priority 3 — Consistency (shared components)

8. **One status badge component** for `aktiv` etc. — currently blue/round in "Im Fokus" and
   grey/pill elsewhere (`features/polls/PublicPollCard.tsx`, `PollPage.tsx`).
9. **Vote count badge**: the bare blue "1" reads like a notification count; add a label
   ("1 Stimme") or move it into the metadata line.
10. **Links vs. actions**: define one style for navigation links and one for action buttons
    (e.g. "Identität bearbeiten" is a button styled like a link) in `app/styles.css`.
11. **Card padding**: remove the card-in-card nesting of the featured poll.

## Priority 4 — Copy and i18n (`shared/i18n/translations.ts`)

12. Plural handling: "1 Stimmen" → "1 Stimme" / "n Stimmen" (`votes` keys).
13. `duration: 'Laufzeit'` shows only an end date → rename to "Endet am" or show a range;
    optionally add remaining time.
14. Remove or shorten the "Optionsnummer n" line under each option (`optionNumber`).
15. Localize `title: 'Audit Log'` (e.g. "Prüfprotokoll").

## Priority 5 — Accessibility

16. Touch targets ≥ 44px for "Alle Abstimmungen anzeigen" (19px) and "Admin" (24px).
17. Raise eyebrow labels ("IDENTITÄT", "IM FOKUS") from 10.4px to at least 12px.
18. Increase visibility of the option radio indicators.
19. Two landmarks named "Hauptnavigation": fully hide the inactive one from assistive tech or
    give them distinct labels.
20. Give poll card links a clean accessible name (currently "Flamongo - Freitag1aktivErstel…").

## Validation
- Update affected tests (`PollsPage.test.tsx`, `PollPage.test.tsx`, `HomePage.test.tsx`,
  `App.test.tsx`).
- Re-check desktop and 375px layouts in all four themes (Hell, Dunkel, Sepia, Eco).
