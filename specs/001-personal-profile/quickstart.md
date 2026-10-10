# Quickstart: Personal Profile

## Prerequisites

- Java 21 and Maven
- Node.js 22 and pnpm 10.6.1
- Repository checked out at the feature changes
- `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH` for local backend startup

## Build and Start

From the repository root, generate and validate the backend contract:

```powershell
mvn -s .mvn/settings.xml test
```

Start the backend in one terminal:

```powershell
$env:ADMIN_USERNAME='admin'
$env:ADMIN_PASSWORD_HASH='<bcrypt-hash>'
mvn -s .mvn/settings.xml -pl bootstrap -am spring-boot:run
```

Start the SPA in another terminal:

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

Open the Vite URL, set an identity through the existing identity editor, and
use the existing administrator flow to create and publish at least two public
polls. Cast one vote in each, then open `/profile`.

## Expected Validation

- The profile page shows the current identity and exactly the two current
  votes, including poll title, lifecycle, option, and vote timestamp.
- Changing an option or withdrawing a vote updates the profile after the page
  refreshes or the query is refetched.
- Changing the identity shows only the new identity's current votes.
- Without an identity, the page shows the identity-empty state and the action
  for setting one; it never shows another identity's data.
- With an identity but no current public vote, the page shows the distinct
  no-current-vote state.
- Expired and archived public polls remain eligible; private, draft, and
  deleted polls do not appear.
- A direct request without an identity cookie, or with a malformed identity
  cookie, returns `200`, `userID: null`, an empty `votes` array, and
  `Cache-Control: no-store`.

## Quality Gates

Run the established frontend checks from `frontend/`:

```powershell
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm test:e2e:all
```

Run the existing container quality gate from `.github/workflows/ci.yml` for both
`linux/amd64` and `linux/arm64`: build `Dockerfile` separately for each platform,
start each runtime image with a temporary SQLite volume, verify the SPA, public
poll, missing-API, health, and readiness responses, then remove every container
and volume.

The focused automated coverage must include domain identity isolation and
visibility rules, HTTP cookie/privacy and cache behavior, OpenAPI declaration,
frontend loading/error/empty states, navigation, and identity/vote refresh
behavior. Refer to [data-model.md](data-model.md) and
[contracts/identity-votes.md](contracts/identity-votes.md) for the detailed
rules.
