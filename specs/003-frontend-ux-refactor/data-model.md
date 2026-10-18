# Data Model: Frontend UX Refactoring

No server-side entity changes. The models below are frontend UI state and view models.

## PollListState (`features/polls/pollListState.ts`)

| Field | Type | Rule |
|---|---|---|
| `sort` | `'newest' \| 'oldest'` | Default `newest` |
| `dateFilter` | `PollDateFilter` = `'all' \| 'yesterday' \| 'today' \| 'tomorrow' \| 'date'` | **Default `all`** (was `today`); unknown values → `all` |
| `from` / `to` | `string \| null` (`YYYY-MM-DD`) | Only kept when `dateFilter === 'date'`; `from` or `to` without `date` param implies `date` |

- **Serialization**: `all` is omitted; every other filter is written as `date=<value>`.
- **Projection**: `all` → sorted list without date filtering; invalid range keeps the existing
  "show all sorted + error" behavior.
- **Transitions**: any filter → `all` via „Filter zurücksetzen“ (top bar or empty state).

## Empty state view model (`PollsPage`)

| Condition | Title | Action |
|---|---|---|
| `dateFilter === 'all'`, 0 polls | generic `common.empty` | none |
| other filter, 0 polls | `polls.emptyForFilter` with filter label | reset button → `all` |

## Mobile menu state (`app/Header.tsx`)

| Field | Type | Rule |
|---|---|---|
| `menuOpen` | `boolean` | Local state, default `false` |
| `identityDialogOpen` | `boolean` | Local state in `Header`, default `false`; set by „Identität bearbeiten“ in the panel |

Closes on: Escape (focus → menu button), outside click, navigation target selected / route change,
viewport ≥ 900px. Only one of menu or theme panel is open at a time.

Panel content: navigation + read-only identity status. Edit action: closes the panel, then
`identityDialogOpen = true`. Edit action is **not rendered** when route is `/` and identity is
`null` (status „nicht gesetzt“ only). The identity dialog closes on success, cancel or Escape;
focus returns to the menu button.

## IdentityEditor props (`shared/ui/IdentityEditor.tsx`)

| Prop | Type | Default | Rule |
|---|---|---|---|
| `identity` | `string \| null` | — | unchanged |
| `variant` | `'card' \| 'compact'` | `card` | unchanged |
| `identityState` | `'ready' \| 'loading' \| 'error'` | `ready` | unchanged |
| `startEditing` | `boolean` | `false` | opens in edit mode, input focused |
| `onClose` | `() => void` | — | called after cancel and after successful change |
| `confirmation` | `'dialog' \| 'inline'` | `dialog` | `inline` renders the confirmation as a step inside the editor (used by `IdentityDialog`, R13) |

## IdentityStatus (`shared/ui/IdentityEditor.tsx`, exported)

| Prop | Type | Rule |
|---|---|---|
| `identity` | `string \| null` | Non-null: first 8 characters + „…“ if longer, full value in `title` and `aria-label` |
| `identityState` | `'ready' \| 'loading' \| 'error'` | `null` + `ready` → `common.identityNotSet`; `null` + other → `common.identityNotLoaded` |

Used by `IdentityEditor` (view mode) and the mobile menu panel (R17).

## Viewport state (`useMediaQuery`)

| Input | Output | Rule |
|---|---|---|
| query `(min-width: 900px)` | `boolean` | `false` when `window.matchMedia` is unavailable; updates on `change` events. When it becomes `true`, `menuOpen` is set to `false` (R15) |

## Identity inline state (`PollPage` / `IdentityEditor`)

| Field | Type | Rule |
|---|---|---|
| `identityEditorOpen` (PollPage) | `boolean` | Shown only if poll `active`, identity query ready and identity `null` |
| `startEditing` (prop) | `boolean` | Editor opens in edit mode |
| `onClose` (prop) | `() => void` | Called on cancel and after successful change; PollPage closes the editor and returns focus to the notice button on cancel |

Derived: `canVote = public && active && identity !== null && identity query ready` (unchanged).

## PollStateBadge (`features/polls/PollStateBadge.tsx`)

| Prop | Type |
|---|---|
| `state` | `Poll['state']` |
| `id` | `string` (optional, for `aria-labelledby` from cards) |

Label from `pollStateTranslationKey(state)`; CSS class `poll-state-badge poll-state-badge--<state>`.

## Vote count (`features/polls/pollFormatters.ts`)

`formatVoteCount(count: number, locale: Locale, t)` → `Intl.PluralRules(locale).select(count)`
→ `polls.voteCountOne` | `polls.voteCountOther`, `{count}` replaced.

Used on: poll cards (start page, list), poll page metadata, results page option meta, option
page. Not used for `<dt>` labels or admin pages.

## Translation keys (de / en)

| Key | de | en | Change |
|---|---|---|---|
| `polls.voteCountOne` | `{count} Stimme` | `{count} vote` | new |
| `polls.voteCountOther` | `{count} Stimmen` | `{count} votes` | new (replaces `polls.votes` usages for counts) |
| `polls.endsAt` | `Endet am` | `Ends on` | replaces `polls.duration` |
| `polls.identityRequired` | `Lege eine Identität fest, um abzustimmen.` | `Set an identity to vote.` | reworded |
| `polls.setIdentity` | `Identität festlegen` | `Set identity` | new |
| `polls.allDates` | `Alle` | `All` | new |
| `polls.emptyForFilter` | `Keine Abstimmungen für „{filter}“` | `No polls for "{filter}"` | new |
| `common.menu` / `common.closeMenu` | `Menü` / `Menü schließen` | `Menu` / `Close menu` | new |
| `audit.title` | `Prüfprotokoll` | `Audit log` | changed (de) |
| `audit.context` | `Prüfprotokoll-Kontext` | `Audit context` | changed (de) |
| `voteAdmin.removeVoteWarning` | `Die Entfernung wird unveränderlich im Prüfprotokoll festgehalten.` | unchanged | changed (de) |
| `common.identityDialogTitle` | `Identität bearbeiten` | `Edit identity` | new (dialog label) |
| `polls.optionNumber` | — | — | no longer used on the poll page |
