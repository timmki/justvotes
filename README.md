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
`ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH` in the environment. Run the SPA
from `frontend/` with `pnpm dev`; Vite proxies `/api` to the backend.

The default database path is `/data/justvotes.db`. It can be overridden with
`DATABASE_URL`. At startup, Flyway validates and runs the migrations in
`bootstrap/src/main/resources/db/migration`; startup is aborted if the migration
history differs.

Exactly one system administrator and their BCrypt hash must also be configured during
installation: `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH`. The application does not
start without these values.

```powershell
docker build -t justvotes .
docker run --rm -p 8080:8080 -v justvotes-data:/data `
  -e ADMIN_USERNAME=admin `
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

## System Administrator Session

`GET /api/v1/csrf` returns the CSRF token and sets the associated cookie.
`POST /api/v1/admin/login` expects JSON with `username` and `password`; the token
must be sent in the `X-XSRF-TOKEN` header. Successful logins receive a server-side
HTTP session. `POST /api/v1/admin/logout` also requires the CSRF token and ends the
session. Unauthenticated requests to `/api/v1/admin` receive `401` as RFC 9457
problem details.

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
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD_HASH="$2a$10$yXyXCUgriz0cm1V1n0fypOPqDx.vQRVFpB42WFqYRQgPWd/vDC40m" justvotes
```

```cmd
docker build --build-arg VITE_APP_NAME="Foo App" -t justvotes .
docker run --rm -p 8080:8080 -e ADMIN_USERNAME=admin -e ADMIN_PASSWORD_HASH="$2a$10$yXyXCUgriz0cm1V1n0fypOPqDx.vQRVFpB42WFqYRQgPWd/vDC40m" -e DATABASE_URL=jdbc:sqlite:/data/justvotes.db justvotes
```

Then verify `/`, a direct SPA route such as `/polls`, `/api/v1/missing` (404), `/actuator/health` and `/actuator/health/readiness`. The same checks run automatically in `.github/workflows/ci.yml`.

Set `API_DOCS_ENABLED=true` in local, test, or staging environments to expose the contract at `/api-docs/openapi-v1.yaml` and Swagger UI at `/swagger-ui/index.html`. It is disabled by default in production. Swagger UI uses `/api/v1/csrf` to obtain the `X-XSRF-TOKEN` value before state-changing calls; administrator calls also require an authenticated session cookie.
