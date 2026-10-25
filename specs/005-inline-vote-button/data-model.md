# Data Model: Inline Vote Button

No server data changes. The feature only reshapes local UI state on the poll page.

## Poll page vote state (existing, `PollDetail`)

| Field | Type | Notes |
|---|---|---|
| `selectedOptionNumber` | `number \| null` | Checked radio; changing it clears `mutationError` (new) |
| `confirmedOptionNumber` | `number \| null` | Current vote of the identity |
| `submitEnabled` | derived `boolean` | Active poll ∧ can vote ∧ selection ≠ current vote ∧ not pending (unchanged) |
| `mutation.isPending` | `boolean` | Locks the fieldset; the pending row keeps its busy button |
| `mutationError` | `FrontendError \| null` | Now rendered inside the selected row instead of below the list |

## Option row view model (new, `PollOptionRow` props)

| Field | Type | Derived from |
|---|---|---|
| `option` | `{ number, text }` | poll option |
| `selected` | `boolean` | `selectedOptionNumber === option.number` |
| `current` | `boolean` | `currentOptionNumber === option.number` |
| `showSubmit` | `boolean` | `selected && (submitEnabled \|\| mutation.isPending)` |
| `pending` | `boolean` | `selected && mutation.isPending` |
| `error` | `FrontendError \| null` | `mutationError` when `selected`, else `null` |

Row-local UI state: `optionLines: number | undefined`, measured from the ghost text while `showSubmit` is true.

Page-level ref (new): `focusInFormOnSubmit: boolean`, set in `onMutate` from `document.activeElement`. After success,
focus always moves to the voted radio (FR-008) and the ref is not consulted. After failure, the ref decides whether
focus returns to the row button, then it is reset.

## State transitions of one row

```text
idle ──select──▶ selected ──(≠ current vote)──▶ selected+button
selected+button ──activate──▶ pending ──success──▶ current (no button, focus on radio)
                                     └─failure──▶ selected+button+error (focus on button) ──select other──▶ idle (error cleared)
selected+button ──select other──▶ idle
selected+button ──select current vote──▶ idle (button gone)
```

Invariant: at most one row has `showSubmit === true`.
