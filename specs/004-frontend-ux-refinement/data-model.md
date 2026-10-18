# Data Model: Frontend UX Refinement

No server-side entities change. This feature adds client-side UI state and a design token
set. Server state (poll, results, identity) stays in React Query.

## Vote form state (`PollPage.tsx`, local)

| Field | Type | Source | Notes |
|---|---|---|---|
| `confirmedOptionNumber` | `number \| null` | results query (current vote of the identity) | Updated on successful submit |
| `selectedOptionNumber` | `number \| null` | radio `onChange` | Local only; never sent until submit; not persisted |
| `mutation.isPending` | `boolean` | `useCastVoteMutation` | Drives loading state |
| `mutationError` | `FrontendError \| null` | mutation `onError` | Shown with `role="alert"` |
| `canVote` | derived | poll `active` + identity loaded and set | Existing rule |

**Derived**: `submitEnabled = canVote && selected !== null && selected !== confirmed && !isPending`.

**State transitions**

```text
idle ──select(n)──▶ selected(n) ──select(m)──▶ selected(m)
selected(n) ──submit──▶ submitting(n) ──success──▶ idle (confirmed = n, status message)
                                      └─error────▶ selected(n) (error shown, submit enabled)
selected(n == confirmed) ── submit disabled
any ──identity missing / poll not active──▶ locked (fieldset disabled)
```

Leaving the page in `selected` sends nothing (spec edge case).

## Identity notice state (`PollPage.tsx`, local)

| Field | Type | Notes |
|---|---|---|
| `identityNoticeVisible` | derived | poll `active`, identity query settled without error, no identity |
| `identityEditorOpen` | `boolean` | Inline editor replaces the notice while open |
| `noticeLeaving` | `boolean` | 200ms removal transition; skipped under reduced motion |
| `focusVotingAfterSave` | `boolean` | Set by `IdentityEditor.onSaved`; consumed once the fieldset is enabled |
| `statusMessage` | `string \| null` | Polite announcement `polls.identitySavedCanVote` |

## Identity action label (shared)

`identityActionKey(identity: string | null)` → `'common.identitySet'` when `identity` is
`null`, otherwise `'common.identityChange'`. Used by sidebar, mobile menu, start page, poll
notice and identity editor heading.

## Mobile menu state (`Header.tsx`, local)

| Field | Type | Notes |
|---|---|---|
| `menuOpen` | `boolean` | Existing |
| `isDesktop` | `boolean` | `useMediaQuery('(min-width: 900px)')`; `true` forces `menuOpen = false` |
| Side effects while open | — | `menu-open` class on `<html>` (scroll lock), backdrop rendered, Tab wrap, Escape/backdrop close with focus return |

## Poll fact line (derived view model)

| Part | Source | Rule |
|---|---|---|
| State | `poll.state` | `PollStateBadge` |
| End | `poll.endsAt` | "Endet am {formatTimestamp}"; omitted when `null` (no dangling separator) |
| Votes | `poll.totalVotes` | `formatVoteCount` (0/1/n, de/en) |

## Design token set (`styles.css`)

Defined on `:root` (light) and overridden in `[data-theme='dark']`, `[data-theme='claude']`,
`[data-theme='openai']`. Names and values: see [research R2/R3](research.md#r2-design-token-set)
and [ui-contract.md](contracts/ui-contract.md#design-tokens).

| Group | Tokens | Scope |
|---|---|---|
| Colour | `--fg`, `--focus-ring`, `--button-primary-bg`, `--button-primary-fg`, `--control-accent` + existing colour tokens | Whole frontend incl. admin |
| Spacing | `--space-1` … `--space-6`, `--space-8` | App shell, start, list, poll page |
| Radius | `--radius-control`, `--radius-tile`, `--radius-card`, `--radius-pill` | App shell, start, list, poll page |
| Type | `--font-size-display`, `--font-size-featured`, `--font-size-card-title`, `--font-size-meta`, `--font-size-eyebrow`, `--font-size-stat` | App shell, start, list, poll page |

**Validation rules**: `--button-primary-fg` on `--button-primary-bg` ≥ 4.5:1 and
`--focus-ring` against the adjacent background ≥ 3:1 in every theme (measured by Playwright).
