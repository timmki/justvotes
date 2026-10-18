# Handoff Spec: App Shell, Start Page and Poll Page (refinement pass)

Follow-up to `specs/003-frontend-ux-refactor`. It describes the current screens as built and
specifies the remaining changes from the second design review. Items marked **[change]** are
new work; everything else documents existing behaviour that must be kept.

Values were measured at 1024×768 and 375×812 in the light theme ("Hell") and taken from
`frontend/src/app/styles.css`.

## Overview

JustVotes lets people vote in public polls under a pseudonymous identity. The main task is:
**set an identity → open a poll → choose an option**. Visitors often arrive through a shared
poll link on their phone, so the poll page and the mobile shell matter most.

- **App shell**: a sidebar (desktop) or a compact header with a menu (mobile), plus the
  language and theme controls.
- **Start page** (`/`): identity card, featured poll, public stats.
- **Poll page** (`/poll/:id`): title, identity notice, options to vote on, metadata.

## Layout

| Region | Desktop (≥ 900px) | Mobile (< 900px) |
|---|---|---|
| Shell grid | `15rem` sidebar + `minmax(0, 1fr)` content | single column |
| Sidebar | sticky, full height, padding `space-6` / `space-4` | hidden |
| Header | sticky, `min-height: 4.5rem`, blurred `--raised` at 84% | sticky, `min-height: 3.9rem`, brand + DE + theme + menu |
| Main padding | top `clamp(…)` (61px at 1024), sides `clamp(1rem, 4vw, 3.5rem)`, bottom `6rem` | top `space-4`, sides `space-4` |
| Poll layout | `minmax(0, 1fr)` + `minmax(15rem, 20rem)`, gap `space-4` | one column, metadata below the voting card |

Lists and stat grids switch to one column below `40rem` (640px).

## Design Tokens

### Colour (existing — use these, not literal values)

| Token | Hell | Dunkel | Usage |
|---|---|---|---|
| `--surface` | `#fff` | `#1c1c1e` | Cards, menu panel |
| `--raised` | `#f5f5f7` | `#2c2c2e` | Page background, option rows, hover |
| `--separator` | `#d2d2d7` | `#48484a` | Card and option borders |
| `--separator-soft` | `#e8e8ed` | `#3a3a3c` | Header/menu dividers, metadata rules |
| `--muted` | `#6e6e73` | `#aeaeb2` | Secondary text, meta lines, stat labels |
| `--accent` | `#0071e3` | `#2997ff` | Accent fills |
| `--accent-text` | `#0066cc` | `#64b5ff` | Links, eyebrows, active badge, selected option border |
| `--accent-on` | `#fff` | `#001b36` | Text on accent fills |
| `--danger` | `#b42318` | `#ff9f9a` | Errors |
| `--shadow` | `0 12px 32px rgb(0 0 0 / 8%)` | `0 .8rem 2rem rgb(0 0 0 / 28%)` | Cards |

Sepia (`claude`) and Eco (`openai`) define the same tokens; see `styles.css` lines 49–84.

### [change] New tokens to add

The stylesheet hard-codes `#007aff` in 8+ places (focus rings, primary button, radio accent,
spinner) and has no spacing, radius or type tokens. Add these to `:root` and to each theme.
Then replace the literal values.

| Token | Value (Hell) | Replaces / usage |
|---|---|---|
| `--fg` | `#1d1d1f` | `:root { color }`; already exists in Eco only |
| `--focus-ring` | `var(--accent-text)` | every `outline: 3px solid #007aff` |
| `--button-primary-bg` | `var(--accent-text)` (`#0066cc`) | `.primary-button` background (was `#007aff`) |
| `--button-primary-fg` | `#fff` | `.primary-button` text (was `#000`) |
| `--control-accent` | `var(--accent-text)` | `accent-color` on radios |

Primary button contrast per theme (16px, weight 700 counts as normal text, so it needs 4.5:1):

| Theme | `--button-primary-bg` | `--button-primary-fg` | Ratio |
|---|---|---|---|
| Hell | `#0066cc` | `#fff` | ≈ 5.6:1 ✅ |
| Dunkel | `#2997ff` | `#001b36` | ✅ (≥ 6:1) |
| Sepia | `var(--accent-text)` (accent darkened 18%) | `#faf9f5` | verify ≥ 4.5:1; raw `--accent` is ≈ 3.7:1 ❌ |
| Eco | `#0a7a5e` | `#fff` | ≈ 5.3:1 ✅ (raw `#10a37f` is ≈ 3.2:1 ❌) |

**Why:** the button currently uses black text on bright blue. That passes contrast but doesn't
match the link blue. Using the accent fill directly with light text would fail contrast in
Sepia and Eco.

| Spacing token | Value | Typical use |
|---|---|---|
| `--space-1` | `.25rem` | Badge/text micro gaps |
| `--space-2` | `.5rem` | Header action gap, icon gaps |
| `--space-3` | `.75rem` | Option inner gap, stat gap (mobile) |
| `--space-4` | `1rem` | Card gaps, layout gap, mobile gutters |
| `--space-5` | `1.25rem` | Card padding |
| `--space-6` | `1.5rem` | Sidebar padding, section gap |
| `--space-8` | `2.5rem` | Voting card padding (desktop) |

| Radius token | Value | Use |
|---|---|---|
| `--radius-control` | `.8rem` | Buttons, option rows, notice |
| `--radius-tile` | `1rem` | Stat tiles, voting card |
| `--radius-card` | `1.25rem` | Identity card, poll card |
| `--radius-pill` | `999px` | Status badge |

| Type token | Spec | Use |
|---|---|---|
| `--font-display` | Work Sans 700, `clamp(2.5rem, 6vw, 4.5rem)`, lh 1.02, ls −.05em; 2.25rem below 640px | Page `h1` (poll title) |
| `--font-card-title` | Work Sans 800, `1.1rem` | Poll card title |
| `--font-featured-title` | Work Sans 800, `clamp(1.7rem, 4vw, 3rem)`, lh 1.05 | Featured poll title |
| `--font-body` | Work Sans 400, `1rem`, lh 1.5 | Body |
| `--font-meta` | Work Sans 400, `.85rem`, `--muted` | Card meta, dates |
| `--font-eyebrow` | Work Sans 800, `.75rem`, ls .12em, uppercase, `--accent-text` | "IDENTITÄT", "IM FOKUS" |
| `--font-stat` | Work Sans 800, `1.8rem` (1.4rem < 640px), ls −.04em | Stat values |

## Components

| Component | File | Variant / props | Notes |
|---|---|---|---|
| `PollStateBadge` | `features/polls/PollStateBadge.tsx` | `state`, `id?` | Pill, min-height 1.8rem, `.78rem`/700. `active` uses `--accent-text` for border and text; other states use `--separator` / `--muted`. The only status display allowed anywhere. |
| `PublicPollCard` | `features/polls/PublicPollCard.tsx` | default, `featured` | Whole card is one link. Accessible name = poll title only. Featured shows a larger title and no hover fill. |
| Identity card | `features/home/HomePage.tsx` | no identity / identity set | Eyebrow, `h2`, description, primary action. |
| `IdentityDialog` | `shared/ui/IdentityDialog.tsx` | — | Modal; uses `useDialogFocusTrap`. |
| Identity notice | `features/polls/PollPage.tsx` | shown only when there is no identity and the poll is active | Bordered `--accent-text` box, `--radius-control`, padding `.9rem 1rem`, with the primary button. |
| Option row | `.poll-option` | default, hover, selected, current, disabled | Min height 52px, padding `.8rem .9rem`, radio 20px. |
| Metadata | `.poll-metadata` | — | No fill, no shadow; `dl` rows separated by `--separator-soft`. |
| Mobile menu | `app/Header.tsx` (`.mobile-menu-panel`) | open / closed | Panel under the header, full width. |
| Primary button | `.primary-button` | — | Min height 46px (≥ 44), padding `.7rem 1rem`, `--radius-control`. |

## States and Interactions

| Element | State | Behavior |
|---|---|---|
| Primary button | Default | `--button-primary-bg` / `--button-primary-fg`, shadow `0 .35rem 1rem` at 22% of the fill colour |
| Primary button | Hover | **[change]** fill darkened 8% (`color-mix(in oklab, var(--button-primary-bg), black 8%)`) |
| Primary button | Active | scale .97, opacity .78 (global rule) |
| Primary button | Focus-visible | 3px `--focus-ring` outline, offset 3px |
| Primary button | Loading | **[change]** label stays, spinner on the left, `aria-busy="true"`, disabled |
| Option row | Hover | border `--accent-text` |
| Option row | Selected | border `--accent-text`; radio checked |
| Option row | Current vote | inset 4px left bar `--accent-text` |
| Option row | Disabled (no identity) | **[change]** fieldset opacity `.72` → `.5`, and the option text turns `--muted`. **Why:** .72 reads as "slightly faded", not "unavailable", and touch devices never show the `not-allowed` cursor. |
| Poll card | Hover | background `--raised` (not on the featured card) |
| Identity action label | No identity | **[change]** "Identität festlegen" everywhere (start page, poll notice, sidebar, mobile menu) |
| Identity action label | Identity set | **[change]** "Identität ändern" everywhere. Remove "Identität bearbeiten". Add keys in `translations.ts` (DE + EN). |
| Identity dialog | Saved | Dialog closes, the page re-renders without the notice, focus moves to the first option, polite live-region message "Identität gesetzt. Du kannst jetzt abstimmen." |
| Mobile menu | Open | Button icon changes to ×, `aria-expanded="true"`, label "Menü schließen" |
| Mobile menu | Open | **[change]** backdrop `rgb(0 0 0 / 32%)` below the panel; tap closes. Body scroll locked. |
| Mobile menu | Close | ×, Escape, backdrop tap or choosing a nav item; focus returns to the menu button |
| Filter controls | Default | **[change]** selects and the "Filter zurücksetzen" button share min height 2.75rem and `--radius-control` |

## Content and Hierarchy Changes **[change]**

| Location | Change | Why |
|---|---|---|
| Start page | Remove the top margin left behind by the `sr-only` H1 (~70px gap above the identity card). Keep the H1 for screen readers. | The empty band looks like a loading glitch. |
| Poll page | Move date and `PollStateBadge` out of the voting card to a meta line directly under the H1: `aktiv · Endet am 31.10.2026 · 1 Stimme`. | Poll facts belong to the poll, not the voting form; on mobile they are currently below the notice. |
| Poll page | Remove the creation date from the voting card (it already appears under "Erstellt"). | Duplicate. |
| Poll page | Replace the subtitle "Abstimmungs-Details und Optionen." with the meta line above. | The subtitle carries no information. |
| Sidebar identity card | Let the heading wrap (no ellipsis). Align the action to the text column. | It currently reads "Noch keine Identität …". |
| Mobile menu | Use one horizontal padding (`--space-4`) for nav items and the identity block. | The identity block currently sits flush against the edge. |
| Stats (< 640px) | **[change]** use one column with label and value side by side (`grid-template-columns: 1fr auto`), or shorten the labels to "Aktiv", "Gesamt", "Stimmen". | Three columns at 375px wrap the labels onto three lines. |

## Responsive Behavior

| Breakpoint | Changes |
|---|---|
| ≥ 900px | Sidebar + header with breadcrumb context; two-column poll layout |
| 640–899px | Sidebar hidden; compact header with menu; poll layout stays two columns while space allows (min 15rem metadata) |
| < 640px | Lists and stats one column; display H1 2.25rem; poll layout one column (metadata below the voting card) |
| Minimum | `body { min-width: 320px }`; no horizontal scroll at 320px |

## Edge Cases

- **Long poll titles**: `overflow-wrap: anywhere`; never truncate the H1. Card titles may wrap
  to 3 lines and are then clamped (`-webkit-line-clamp: 3`) **[change]**. The full title stays
  the accessible name.
- **Long option labels**: wrap, never truncate. The radio stays top-aligned (`align-items: flex-start`) **[change]**.
- **Many options (25+)**: no pagination. On mobile, after an identity is set, the notice
  disappears and focus moves to the first option. Consider a sticky "Stimme abgeben" summary
  if the vote needs an explicit submit.
- **English strings** are up to ~30% longer ("Set identity", "Public polls total"). Buttons
  grow in width and wrap only below 320px.
- **Poll not active**: no identity notice and no form. Show results or the release rule in its place.
- **No polls**: the start page hides "Im Fokus"; the list shows the empty state with "Filter zurücksetzen" when a filter is active.
- **Loading**: `QueryState` skeleton or spinner. The spinner uses `--focus-ring`/`--accent-text`, not `#007aff`.
- **Error**: `RouteState` card with `--danger` text and a retry action; the toast is for transient vote errors.
- **Slow connection**: the vote submit button shows the loading state; prevent double submit.

## Animation / Motion

| Element | Trigger | Animation | Duration | Easing |
|---|---|---|---|---|
| Buttons, links | Press | scale .97 + opacity .78 | 120ms **[change: currently no transition]** | ease-out |
| Primary button | Hover | background change | 150ms | ease |
| Mobile menu panel | Open / close | fade + translateY(−8px → 0) | 180ms / 140ms | ease-out / ease-in |
| Menu backdrop | Open / close | opacity 0 → 1 | 180ms | linear |
| Identity notice | Removed after save | fade out + height collapse | 200ms | ease-in-out |
| Spinner | Loading | rotate | 800ms loop | linear |

Every animation must respect the existing `prefers-reduced-motion` rule (durations ≈ 0).

## Accessibility Notes

- **Focus order (poll page, mobile)**: brand → DE → theme → menu → H1 (not focusable) →
  "Identität festlegen" → options → "Prüfprotokoll".
- **Disabled options**: keep `<fieldset disabled>`. **[change]** Add
  `aria-describedby` pointing at the identity notice text, so screen readers say why the options are unavailable.
- **Landmarks**: the hidden sidebar navigation uses `display: none` on mobile; the menu
  navigation is labelled "Menü". Keep both names distinct.
- **Mobile menu**: `aria-expanded`/`aria-controls` on the toggle (already done); Escape
  closes it; focus returns to the toggle; Tab stays within the panel and the toggle while open **[change]**.
- **Identity dialog**: focus trap (already done), initial focus on the input, Escape cancels,
  and focus returns to the button that opened it.
- **Live regions**: announce "Identität gesetzt…" after saving, and the vote result after submitting.
- **Touch targets**: ≥ 44px for all interactive elements, including the footer "Admin" link.
- **Contrast**: all text ≥ 4.5:1 in all four themes; check Sepia and Eco after the primary-button token change.

## Implementation Checklist

1. Add the tokens; replace every `#007aff`/`#000` literal on primary controls.
2. Consolidate the three `.poll-metadata` blocks in `styles.css` (lines ~1605, ~2934, ~3058) into one.
3. Unify the identity action labels (i18n DE + EN), depending on whether an identity is set.
4. Disabled option styling + `aria-describedby`.
5. Poll page meta line under the H1; remove the duplicate date and the empty subtitle.
6. Remove the start page top gap; mobile stats layout.
7. Mobile menu backdrop, scroll lock, focus handling, motion.
8. Check all four themes at 320, 375, 768 and 1024px; update the Vitest/Playwright tests that assert on labels.
