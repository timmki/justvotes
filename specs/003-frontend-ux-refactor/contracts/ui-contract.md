# UI Contract: Frontend UX Refactoring

The HTTP contract (`api-contract/src/main/openapi/justvotes-v1.yaml`) is unchanged. This
document fixes the user-facing interface that tests assert against.

## URL contract: `/polls`

| URL | Effective filter |
|---|---|
| `/polls` | `all` |
| `/polls?date=today` \| `yesterday` \| `tomorrow` | that filter |
| `/polls?date=date&from=YYYY-MM-DD&to=YYYY-MM-DD` | date range |
| `/polls?from=…` (no `date`) | `date` (unchanged) |
| `/polls?date=<unknown>` | `all`, URL canonicalized to `/polls` |
| `sort=oldest` | combinable with all of the above (unchanged) |

## Landmark and heading contract

| Page | `h1` | Navigation landmarks exposed |
|---|---|---|
| `/` | visually hidden, app/home title | exactly one named „Hauptnavigation“ (desktop sidebar, or mobile panel while open) |
| `/polls` | `Abstimmungen` (unchanged) | same |
| `/poll/:id` | poll title | same |

No metadata `h3` „Abstimmung“ on the poll page.

## Mobile header (viewport < 900px)

- One `header` containing: brand link, language button, theme button, menu button.
- Menu button: accessible name `Menü`, `aria-expanded`, `aria-controls` → panel id.
- Panel (rendered only when open): navigation (`nav[aria-label="Hauptnavigation"]` or admin
  navigation) and a read-only identity status with button „Identität bearbeiten“. No identity
  editor inside the panel.
- On `/` without identity the status reads „nicht gesetzt“ and has no edit button.
- „Identität bearbeiten“ closes the panel and opens `role="dialog"` named „Identität
  bearbeiten“ containing the editor with focused input; the confirmation is a step inside the
  same dialog. Success, cancel or Escape close the dialog; focus returns to the menu button.
- Escape closes the panel and focuses the menu button; selecting a link closes the panel.
- Growing the viewport to ≥ 900px while the panel is open removes the panel and shows the
  desktop sidebar navigation.
- Header height ≤ 80px at 375×812; no sidebar bar, no separate navigation bar.

## Poll page without identity (active poll)

- First element in the voting card: notice text + button `Identität festlegen`.
- `fieldset.poll-vote-form` is `disabled` and `aria-describedby` the notice.
- Button opens the identity editor in place (input focused); cancel restores the notice and focus.
- After a confirmed change: notice gone, options enabled.

## Poll card

- Link accessible name = poll title + state label (e.g. „Flamongo - Freitag, aktiv“).
- State shown via `PollStateBadge`; vote count as text („1 Stimme“), no numeric bubble.

## Size and contrast thresholds

- Interactive targets on `/`, `/polls`, `/poll/:id`: ≥ 44×44px.
- `.eyebrow` computed font size ≥ 12px.
- Option radio border vs. card background ≥ 3:1 in `light`, `dark`, `claude`, `openai`,
  measured from computed styles in a browser test (radio uses `appearance: none` with an
  explicit border).
- `.poll-metadata`: computed `background-color` transparent or equal to the page background,
  `box-shadow: none`; at most one 1px separator border.
- Vote counts render as „1 Stimme“ / „n Stimmen“ (de) and „1 vote“ / „n votes“ (en) on start,
  list, poll, results and option pages.
- German UI contains no „Audit“ text; it reads „Prüfprotokoll“ (defined in `CONTEXT.md`).
- Radio contrast is measured for unselected and selected options.
- Touch target checks cover standalone controls; inline links inside running text (`main p a`)
  are exempt (WCAG 2.5.8 inline exception).
- No horizontal scroll at 320px and 375px.
