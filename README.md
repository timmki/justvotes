# JustVotes

JustVotes manages public and private polls.

## Getting Started

The application requires Java 21. Maven must be run in this environment with the checked-in
settings file:

```powershell
mvn -s .mvn/settings.xml test
```

For separate backend development, start the Spring Boot module with
`mvn -s .mvn/settings.xml -pl bootstrap -am spring-boot:run` and provide
`ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH` in the environment. Run the SPA
from `frontend/` with `pnpm dev`; Vite proxies `/api` to the backend.

The default database path is `/data/justvotes.db`. It can be overridden with
`DATABASE_URL`. At startup, Flyway validates and runs the migrations in
`bootstrap/src/main/resources/db/migration`; startup is aborted if the migration
history differs.

Exactly one system administrator and their BCrypt hash must also be configured during
installation: `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH`. The application does not
start without these values. Everybody, the administrator included, signs in with their email
address and password. On the first start these values create the administrator account; a
changed `ADMIN_EMAIL` is applied to it on the next start (it must not belong to a user account);
afterwards a password changed in the application is kept. To recover a lost administrator
password, set a new `ADMIN_PASSWORD_HASH` together with `ADMIN_PASSWORD_RESET=true` for one
start and remove the flag again.

**Upgrading from a version without accounts deletes all existing votes and their vote events
once** (Flyway migration `V7`); polls, options and the template catalog are kept. Back up the
SQLite file before upgrading if you need the old votes.

```powershell
docker build -t justvotes .
docker run --rm -p 8080:8080 -v justvotes-data:/data `
  -e ADMIN_EMAIL=admin@example.test `
  -e ADMIN_PASSWORD_HASH="$2a$10$yXyXCUgriz0cm1V1n0fypOPqDx.vQRVFpB42WFqYRQgPWd/vDC40m" justvotes
```

The application serves its static files from the same origin. Operational endpoints:

- `GET /actuator/health`
- `GET /actuator/health/readiness`

SQLite uses WAL, a five-second `busy_timeout`, and a bounded connection pool. Logs are
written as JSON to standard output. Forwarded headers are processed at the Tomcat level
so that session cookies set by the container also see the external HTTPS scheme. The TLS
proxy must set `X-Forwarded-Proto` for this to work; direct, untrusted forwarded headers
must not be allowed.

## Accounts, Sign-in and Invitations

Every page and API requires a signed-in local account; without a session only the login page,
the invitation page, `GET /api/v1/csrf`, `/config.js` and the health endpoints are reachable.
There is no external identity provider. Two roles exist:

- **Administrator** – the single account from `ADMIN_EMAIL`; it only sees the administration
  (polls, template catalog, votes, accounts, invitations) and never votes.
- **User** – every invited account; it signs in with the invited email address, owns exactly one
  fixed identity (shown as display name in polls and the audit log, while the email address stays
  hidden from other accounts), sees and uses polls and its personal profile, and can change its own
  password.

`GET /api/v1/csrf` returns the CSRF token and sets the associated cookie.
`POST /api/v1/session/login` expects JSON with `email` and `password` plus the token in
`X-XSRF-TOKEN`; it rotates and sets the server-side session cookie and returns the signed-in
account. `GET /api/v1/session` returns the current account, `POST /api/v1/session/logout` ends
the session, and `PUT /api/v1/session/password` changes the own password (other sessions of the
account end). Sessions expire after 30 minutes without activity and at the latest 12 hours after
login. Five failed logins for the same email address block further attempts for 30 seconds, doubling up
to 15 minutes (`429` with `Retry-After`).

The administrator invites people by email under *Administration → Einladungen*. Invitation links
are valid for 7 days and can be used once; they point to `PUBLIC_BASE_URL/invitation#token=…`.
Locking an account ends its sessions; a one-time password set by the administrator must be
replaced at the next login. Security events are logged as JSON with the logger
`justvotes.security`, never with passwords or tokens.

Invitation mail is sent via SMTP and only offered when `MAIL_HOST` and `PUBLIC_BASE_URL` are set:

| Variable | Default | Purpose |
|---|---|---|
| `PUBLIC_BASE_URL` | – | External address used in invitation links, e.g. `https://votes.example.org` |
| `MAIL_HOST` | – | SMTP host; without it invitations are rejected with `invitation-delivery-unavailable` |
| `MAIL_PORT` | `587` | SMTP port |
| `MAIL_USERNAME` / `MAIL_PASSWORD` | – | SMTP credentials; authentication is only used when a username is set |
| `MAIL_STARTTLS` | `true` | Use STARTTLS |
| `MAIL_FROM` | `justvotes@MAIL_HOST` | Sender address |

A missing or unreachable mail server never affects `/actuator/health`; failed deliveries are shown
at the invitation and can be resent.

Several people can be invited at once from an address book export: under *Administration →
Einladungen → Aus Datei einladen* the administrator chooses a vCard file (`.vcf`, versions 3.0 and
4.0, at most 1 MB and 500 contacts). The application only reads each contact's name and preferred
email address and shows a preview: who will be invited, whose expired invitation will be renewed, and
who is skipped (already has an account, already invited, duplicate, missing or invalid address). After
confirming, every selected contact receives a normal invitation; the contact name is suggested as the
display name on the invitation page and can be changed. The file itself is never stored.

## API Contract and Documentation

The versioned OpenAPI contract is maintained at `api-contract/src/main/openapi/justvotes-v1.yaml`. Maven validates it and generates the server interfaces and DTOs; generated sources remain under `target/generated-sources`.

The same Maven execution generates the TypeScript client under `api-contract/target/generated-sources/typescript`; generated sources are never edited or committed. To run the contract compile check, first generate both clients and then run `npm ci` and `npm run typecheck` in `api-contract/typescript-contract`.

## Frontend

The React/Vite SPA is developed independently from the backend in `frontend/`:

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm build` generates the local OpenAPI TypeScript client and writes production assets to the ignored `frontend/dist/` directory. The frontend quality gates are:

```bash
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
```

`pnpm test:e2e` runs the fast local Chromium check. `pnpm test:e2e:all` runs the configured Chromium, Edge, Firefox and WebKit projects after installing their Playwright browsers. WebKit is the reproducible Safari approximation in Linux CI; iOS Safari and two parallel browser release versions are not available on the hosted runner and are therefore not claimed as covered.

The displayed app name defaults to `JustVotes` and can be changed at frontend build time with `VITE_APP_NAME`, for example `$env:VITE_APP_NAME='PollBoard'; pnpm build`. Docker builds accept the same value as `--build-arg VITE_APP_NAME=PollBoard`; setting it only when starting the container is too late because the SPA is compiled into the image.

The generated API client is intentionally not committed. `mvn -s .mvn/settings.xml test` generates the server and contract sources for normal backend tests; `npm ci && npm run typecheck` in `api-contract/typescript-contract` checks the generated contract client. Normal Maven builds do not start Node or pnpm. The complete release build is `mvn -s .mvn/settings.xml -Prelease package`; it installs the locked frontend dependencies, builds the SPA, and embeds those assets in the executable JAR. The release profile is also used by the Docker build; Node and pnpm exist only in its build stage.

Build and smoke-test the final image with a temporary SQLite volume:

```bash
docker build --build-arg VITE_APP_NAME="Foo App" -t justvotes .
docker run --rm -p 8080:8080 -v justvotes-data:/data \
  -e ADMIN_EMAIL=admin@example.test \
  -e ADMIN_PASSWORD_HASH="$2a$10$yXyXCUgriz0cm1V1n0fypOPqDx.vQRVFpB42WFqYRQgPWd/vDC40m" justvotes
```

```cmd
docker build --build-arg VITE_APP_NAME="Foo App" -t justvotes .
docker run --rm -p 8080:8080 -e ADMIN_EMAIL=admin@example.test -e ADMIN_PASSWORD_HASH="$2a$10$yXyXCUgriz0cm1V1n0fypOPqDx.vQRVFpB42WFqYRQgPWd/vDC40m" -e DATABASE_URL=jdbc:sqlite:/data/justvotes.db justvotes
```

Then verify `/`, a direct SPA route such as `/polls`, `/api/v1/missing` and `/api/v1/polls` (401 without a session), `/actuator/health` and `/actuator/health/readiness`. The same checks run automatically in `.github/workflows/ci.yml`.

Set `API_DOCS_ENABLED=true` in local, test, or staging environments to expose the contract at `/api-docs/openapi-v1.yaml` and Swagger UI at `/swagger-ui/index.html`. It is disabled by default in production and, when enabled, only available to the signed-in administrator (sign in through the application first; Swagger UI then uses the same session cookie). Swagger UI uses `/api/v1/csrf` to obtain the `X-XSRF-TOKEN` value before state-changing calls.
