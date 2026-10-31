---

description: "Task list for 006-local-user-auth"
---

# Tasks: Lokale Konten mit Anmeldung und Berechtigungen

**Input**: Design documents from `/specs/006-local-user-auth/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/openapi-delta.md](contracts/openapi-delta.md), [quickstart.md](quickstart.md)

**Tests**: Enthalten. Die Constitution (Prinzip V) verlangt Unit-Tests für
Domänenregeln, Integrationstests für Integrationsgrenzen und Frontend-/E2E-Tests
für betroffene Nutzerabläufe.

**Organization**: Tasks sind nach User Stories gruppiert, damit jede Story
einzeln umgesetzt und geprüft werden kann.

**Berücksichtigte Analyse-Befunde**: I1 (Logger in `adapters/shared`), I2
(`AdminPage.tsx` und `Header.tsx` bereits in US1 auf `useSessionQuery`), I3
(Dateiorte gemäß plan.md), U1 (Test-Fixture für User-Konten in Phase 2), C1
(Mail-Health aus, Mailer nur mit `MAIL_HOST`), K1 (API-Doku nur für Admin),
T1 (Einladungs-E2E als Komponenten-E2E), G1 (`AuditPage.tsx` in Bereinigung),
U2 (Einladungslink bei bestehender Anmeldung, research R13), I4
(`InvitationMailer.isAvailable()`), L1 (`nameFingerprint` statt Kontoname bei
unbekanntem Konto, research R12).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallel ausführbar (andere Dateien, keine offenen Abhängigkeiten)
- **[Story]**: zugehörige User Story (US1–US5)

## Path Conventions

- Domänenkern: `account-management/src/main/java/de/justvotes/accountmanagement/core/`
- Adapter: `adapters/src/main/java/de/justvotes/adapters/`
- Bootstrap: `bootstrap/src/main/java/de/justvotes/bootstrap/`
- Vertrag: `api-contract/src/main/openapi/justvotes-v1.yaml`
- Frontend: `frontend/src/`, E2E: `frontend/e2e/`

Alle Java-Tasks folgen `docs/development/java.md` (kein `var`, keine
Ternärausdrücke, Records für Value Objects, Constructor Injection). Alle
Frontend-Tasks folgen `docs/development/frontend.md` (keine Ternärausdrücke,
React Query für Serverzustand, Texte über `frontend/src/shared/i18n/translations.ts`).
Generierte Quellen werden nie bearbeitet; nach Vertragsänderungen
`mvn -s .mvn/settings.xml -pl api-contract -am install` bzw. `pnpm generate:api`.
`adapters` erhält keine Spring-Security- oder Spring-Mail-Abhängigkeit (plan.md,
„Adapter-/Security-Grenze“).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Neues Domänenmodul und Abhängigkeiten anlegen

- [X] T001 Create Maven module `account-management` with `account-management/pom.xml` mirroring `template-catalog/pom.xml` (parent `de.justvotes:justvotes`, Lombok provided, JUnit Jupiter test) and register `<module>account-management</module>` before `api-contract` in `pom.xml`
- [X] T002 [P] Create `account-management/src/main/java/de/justvotes/accountmanagement/package-info.java` documenting the framework-independent account and invitation core (analog `template-catalog/src/main/java/de/justvotes/templatecatalog/package-info.java`)
- [X] T003 Add dependency `de.justvotes:account-management` to `adapters/pom.xml` and `spring-boot-starter-mail` to `bootstrap/pom.xml` only (research R7)
- [X] T004 [P] Add terms **Konto** (lokaler anmeldefähiger Zugang; besitzt bei Rolle User genau eine feste Identität, ist nicht Synonym für Identität), **Einladung** and **Rolle** (`User`, `Administrator`) to `CONTEXT.md`; change **Identität** to „fest einem User-Konto zugeordnet, nicht frei wählbar“ and **Prüfprotokoll** from „öffentlich lesbar“ to „für alle angemeldeten User-Konten lesbar“; remove „beim Identitätswechsel entfernte Stimme“ from **Domänenereignis**
- [X] T005 [P] Update `docs/development/architecture.md` module table with `account-management` and document the adapter/security boundary from plan.md (security-context-writing controllers, `SpringPasswordHasher` and `SmtpInvitationMailer` in `bootstrap`; `AuthenticatedAccount` and `SecurityEventLogger` in `adapters/shared`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Kontomodell, Persistenz, Migration, Passwort-Hashing,
Sitzungsinfrastruktur, Sicherheitsereignisse, Test-Fixtures und
Administrator-Bootstrap – Voraussetzung für alle Stories

**⚠️ CRITICAL**: Keine Story-Arbeit vor Abschluss dieser Phase

### Tests (zuerst schreiben, müssen fehlschlagen)

- [X] T006 [P] Unit tests for value objects in `account-management/src/test/java/de/justvotes/accountmanagement/core/model/ValueObjectsTest.java`: `AccountName` „3–32 Codepoints, `[A-Za-z0-9._-]`, nicht nur Ziffern“, `EmailAddress` „3–254 Zeichen, genau ein `@`, nicht leer davor/danach“, `AccountIdentity` „1–64 Codepoints, keine führenden/abschließenden Leerzeichen“, `Password` „12–128 Codepoints, nicht nur Leerraum“; each `normalized()` lowercases with `Locale.ROOT`
- [X] T007 [P] Unit tests for `Account` invariants in `account-management/src/test/java/de/justvotes/accountmanagement/core/model/AccountTest.java`: „`role = USER` ⇔ `identity` und `email` gesetzt“, „`role = ADMIN` ⇒ `status = ACTIVE` immer“, `createAdmin`, `createUser`, `verifyLogin` fails identically for `LOCKED`
- [X] T008 [P] Migration integration test in `bootstrap/src/test/java/de/justvotes/bootstrap/LocalAccountsMigrationTest.java`: start Flyway up to V6 on a temp SQLite file, insert poll, options, votes and events of all types, migrate to V7, assert `Vote` empty, `PollDomainEvent` contains only non-vote events, `Poll`/`Option`/catalog untouched, `Admin` table absent, `Account`/`Invitation` present
- [X] T009 [P] Persistence integration test in `bootstrap/src/test/java/de/justvotes/bootstrap/AccountPersistenceIntegrationTest.java`: unique `nameKey`, `identityKey`, `emailKey`; CHECK constraint for USER/ADMIN; only one ADMIN row (partial unique index)
- [X] T010 [P] Bootstrap test in `bootstrap/src/test/java/de/justvotes/bootstrap/AdminAccountBootstrapTest.java`: first start creates ADMIN account from `ADMIN_USERNAME`/`ADMIN_PASSWORD_HASH` with `{bcrypt}` prefix; second start with different hash keeps stored hash; `ADMIN_PASSWORD_RESET=true` replaces hash and increments `sessionEpoch`; blank username or non-BCrypt hash aborts startup (behavior of current `validateAdminConfiguration`)
- [X] T011 [P] Extend `bootstrap/src/test/java/de/justvotes/bootstrap/OperationalEndpointsTest.java`: without `MAIL_HOST` the context starts, `/actuator/health` and `/actuator/health/readiness` report `UP` and no `mail` health component exists (research R7)

### Implementation

- [X] T012 [P] Create records `AccountId`, `AccountName`, `EmailAddress`, `AccountIdentity`, `Password`, `PasswordHash` and enums `Role {USER, ADMIN}`, `AccountStatus {ACTIVE, LOCKED}` in `account-management/src/main/java/de/justvotes/accountmanagement/core/model/` with the validation rules quoted in T006
- [X] T013 Create aggregate `Account` in `account-management/src/main/java/de/justvotes/accountmanagement/core/model/Account.java` with fields from data-model.md (`id`, `name`, `role`, `identity?`, `email?`, `status`, `passwordHash`, `passwordChangeRequired`, `sessionEpoch`, `createdAt`, `updatedAt`), factories `createUser`/`createAdmin`, `verifyLogin(Password, PasswordHasher)` and `resetAdminPassword(PasswordHash)`; identity, name and role immutable
- [X] T014 [P] Create out-ports `AccountRepository` (`findById`, `findByNameKey`, `findAdmin`, `existsByNameKey`, `existsByIdentityKey`, `existsByEmailKey`, `save`, `findAll`), `PasswordHasher` (`hash`, `matches`, `needsUpgrade`), `UtcClock` in `account-management/src/main/java/de/justvotes/accountmanagement/core/ports/out/`
- [X] T015 [P] Create domain exceptions `AccountNameTakenException`, `IdentityTakenException`, `EmailAlreadyInvitedException`, `InvitationNotUsableException`, `PasswordPolicyViolationException`, `CurrentPasswordInvalidException`, `AccountNotManageableException`, `InvalidCredentialsException` in `account-management/src/main/java/de/justvotes/accountmanagement/core/exception/`
- [X] T016 Create migration `bootstrap/src/main/resources/db/migration/V7__local_accounts.sql` exactly as in data-model.md „Persistenz“: tables `"Account"` and `"Invitation"` with quoted camelCase columns, CHECK constraints, partial unique index on `role` WHERE `role='ADMIN'`, partial unique index on `"emailKey"` WHERE `status='OPEN'`; `DELETE FROM "Vote"`; `DELETE FROM "PollDomainEvent" WHERE "eventType" IN ('VoteCast','VoteReplaced','VoteWithdrawn','VoteRemovedByAdmin','VoteRemovedForIdentityChange')`; `DROP TABLE "Admin"`
- [X] T017 Create `AccountEntity`, `SpringDataAccountRepository` and `JpaAccountPersistenceAdapter` (implements `AccountRepository`) in `adapters/src/main/java/de/justvotes/adapters/accountmanagement/infra/out/persistence/`
- [X] T018 [P] Create `SpringPasswordHasher` in `bootstrap/src/main/java/de/justvotes/bootstrap/config/SpringPasswordHasher.java` wrapping a `DelegatingPasswordEncoder` with default id `pbkdf2@SpringSecurity_v5_8` and `bcrypt` as additional readable encoder (research R2); unit test in `bootstrap/src/test/java/de/justvotes/bootstrap/SpringPasswordHasherTest.java` covering a 64-character umlaut password and BCrypt upgrade detection
- [X] T019 Create `AccountManagementConfiguration` in `bootstrap/src/main/java/de/justvotes/bootstrap/config/AccountManagementConfiguration.java` wiring ports and an `ApplicationRunner` that creates the admin account from `ADMIN_USERNAME`/`ADMIN_PASSWORD_HASH` (stored as `{bcrypt}<hash>`) if none exists and re-applies the hash only when `ADMIN_PASSWORD_RESET=true`, logging `admin-password-reset` (research R8); move `validateAdminConfiguration` here from `SecurityConfiguration.java`
- [X] T020 [P] Create record `AuthenticatedAccount(String accountId, String accountName, String role, String identity)` and helper `AuthenticatedAccounts.current(HttpServletRequest)` (reads request attribute, throws if absent) in `adapters/src/main/java/de/justvotes/adapters/shared/infra/in/http/`
- [X] T021 [P] Create `SecurityEventLogger` in `adapters/src/main/java/de/justvotes/adapters/shared/infra/in/http/SecurityEventLogger.java` using only SLF4J: logger `justvotes.security`, structured fields `event`, `accountId`, `accountName` for existing accounts; for `login-failed`/`login-throttled` on a non-existing name log only `nameFingerprint` = first 12 hex chars of SHA-256 over the normalized name, never the entered name; one method per event `login`, `login-failed`, `login-throttled`, `logout`, `password-changed`, `invitation-issued`, `invitation-resent`, `invitation-revoked`, `invitation-accepted`, `account-locked`, `account-unlocked`, `one-time-password-set`, `admin-password-reset`; never passwords, tokens or hashes (research R12); register as bean in `AccountManagementConfiguration`
- [X] T022 Update `bootstrap/src/main/resources/application.yml`: `server.servlet.session.timeout: 30m`; `management.health.mail.enabled: false`; `spring.mail.port: ${MAIL_PORT:587}`, `spring.mail.username: ${MAIL_USERNAME:}`, `spring.mail.password: ${MAIL_PASSWORD:}`, `spring.mail.properties.mail.smtp.starttls.enable: ${MAIL_STARTTLS:true}`; do NOT set `spring.mail.host` with an empty default – instead `justvotes.mail.host: ${MAIL_HOST:}`, `justvotes.mail.from: ${MAIL_FROM:}`, `justvotes.public-base-url: ${PUBLIC_BASE_URL:}`, `justvotes.admin.password-reset: ${ADMIN_PASSWORD_RESET:false}` (research R7, analysis C1)
- [X] T023 [P] Create test fixture `bootstrap/src/test/java/de/justvotes/bootstrap/support/AccountFixtures.java`: Spring test component that creates `USER` accounts (name, identity, email, password) directly via `AccountRepository` + `PasswordHasher`, plus helpers `loginAsUser(MockMvc, name)` / `loginAsAdmin(MockMvc)` that fetch `/api/v1/csrf`, call `POST /api/v1/session/login` and return `MockHttpSession` + CSRF token; used by all HTTP tests until invitations exist (analysis U1)

**Checkpoint**: Schema migriert, Administratorkonto wird angelegt, Hashing,
Logger und Test-Fixtures verfügbar, Health ohne Mailserver `UP`

---

## Phase 3: User Story 1 – Anmelden und unter fester Identität abstimmen (Priority: P1) 🎯 MVP

**Goal**: Gesamte Anwendung nur nach Anmeldung; einheitliche Anmeldung für alle
Konten; User stimmen unter Kontoidentität ab; Identitätswahl und getrennte
Administratoranmeldung entfallen in API und Frontend.

**Independent Test**: Ohne Anmeldung nur Anmeldeseite und `401` auf allen
APIs; mit über `AccountFixtures` angelegtem User-Konto anmelden, abstimmen,
Stimme im Prüfprotokoll unter Kontoidentität; Administrator meldet sich über
dieselbe Seite an und erreicht die Administration; nach Abmeldung wieder nur
Anmeldung. `pnpm typecheck` ist nach dieser Phase grün.

### Tests for User Story 1 ⚠️

- [X] T024 [P] [US1] HTTP test `bootstrap/src/test/java/de/justvotes/bootstrap/SessionHttpTest.java`: `POST /api/v1/session/login` → `200 CurrentSession` with rotated `JSESSIONID` and `userID` cookie cleared (`Max-Age=0`); wrong password and unknown name both `401 invalid-credentials` with identical body; `GET /session` `200`/`401`; `POST /session/logout` `204` then `GET /session` `401`; CSRF missing → `403`; admin login via same endpoint returns `role: admin`, `identity: null`
- [X] T025 [P] [US1] HTTP test `bootstrap/src/test/java/de/justvotes/bootstrap/AnonymousAccessHttpTest.java`: without session every `/api/v1/**` operation except `/csrf`, `POST /session/login`, `POST /invitations/**` returns `401 authentication-required` without poll data; with `API_DOCS_ENABLED=true` `/api-docs/**` and `/swagger-ui/**` return `401`; `/actuator/health`, `/config.js` and SPA fallback stay reachable
- [X] T026 [P] [US1] HTTP test `bootstrap/src/test/java/de/justvotes/bootstrap/LoginThrottleHttpTest.java`: 5 failures then 6th attempt `429 login-throttled` with `Retry-After`; same for unknown name; success resets counter (research R5)
- [X] T027 [P] [US1] HTTP test `bootstrap/src/test/java/de/justvotes/bootstrap/SessionExpiryHttpTest.java`: session older than 12 h (manipulated login instant via test clock) → `401`; session with stale `sessionEpoch` → `401`; locked account session → `401`
- [X] T028 [P] [US1] Update `bootstrap/src/test/java/de/justvotes/bootstrap/PollManagementHttpTest.java`, `AdministrativeVotesHttpTest.java`, `TemplateCatalogHttpTest.java` and `AdminAuthenticationTest.java` to authenticate via `AccountFixtures.loginAsUser`/`loginAsAdmin` instead of `/admin/login` and `userID` cookie; assert vote is attributed to the account identity
- [X] T029 [P] [US1] Update `poll-management/src/test/java/de/justvotes/pollmanagement/core/VoteManagementTest.java`: remove identity-change cases
- [X] T030 [P] [US1] Frontend unit tests `frontend/src/features/auth/LoginPage.test.tsx` (submit, generic error, throttled message with retry time, focus on error) and `frontend/src/app/App.test.tsx` (without session every route incl. `/admin` renders login; after login return route restored); update `frontend/src/features/admin/AdminPage.test.tsx` to mock `GET /session` instead of the admin session
- [X] T031 [P] [US1] E2E test `frontend/e2e/auth.spec.ts` scenario „anonymous sees only login, login, vote, logout“ including axe check on login page; update `frontend/e2e/app-shell.spec.ts` and `frontend/e2e/profile.spec.ts` to log in first

### Implementation for User Story 1

- [X] T032 [US1] Update `api-contract/src/main/openapi/justvotes-v1.yaml` per contracts/openapi-delta.md: `info.version: 2.0.0`; rewrite `info.description` cookie and session flow; rename scheme `adminSession` → `session`, remove `voterIdentity`; global `security: [{session: []}]`; add `POST /session/login` (`200 CurrentSession`, `401`, `429`), `GET /session`, `POST /session/logout`; schema `CurrentSession` (`accountName`, `role` enum `[user, admin]`, `identity` nullable, `passwordChangeRequired`); remove `/admin/login`, `/admin/logout`, `/admin/session`, `GET /identity`, `POST /identity`, schemas `Identity`/`CurrentIdentity`, enum value `VoteRemovedForIdentityChange`; add `401` to `/polls/**` and `/identity/votes`; add `429` to `x-status-matrix`
- [X] T033 [US1] Update `bootstrap/src/test/java/de/justvotes/bootstrap/CsrfSessionOpenApiContractTest.java` and `CsrfSessionHttpTest.java` to the new session operations
- [X] T034 [P] [US1] Create in-port `Authenticate` and service `Authentication` in `account-management/src/main/java/de/justvotes/accountmanagement/core/` returning `AuthenticatedAccountView` (`accountId`, `name`, `role`, `identity`, `passwordChangeRequired`, `sessionEpoch`); throws `InvalidCredentialsException` for unknown, wrong password and locked alike; triggers hash upgrade when `needsUpgrade`
- [X] T035 [P] [US1] Create `LoginThrottle` in `bootstrap/src/main/java/de/justvotes/bootstrap/config/LoginThrottle.java`: in-memory per normalized name, from 5 consecutive failures lock 30 s doubling up to 15 min, reset on success; dummy hash check for unknown accounts (research R5)
- [X] T036 [US1] Replace `bootstrap/src/main/java/de/justvotes/bootstrap/AdminSessionController.java` with `SessionController.java` implementing the regenerated `SessionApi`: login (throttle, authenticate, `changeSessionId`, store `SecurityContext` with authority `ROLE_USER`/`ROLE_ADMIN`, login instant and `sessionEpoch` in session, clear `userID` cookie), `GET /session`, logout; log `login`, `login-failed`, `login-throttled`, `logout` via `SecurityEventLogger`; map `InvalidCredentialsException` → `401 invalid-credentials`, throttle → `429 login-throttled` + `Retry-After`
- [X] T037 [US1] Create `SessionValidationFilter` in `bootstrap/src/main/java/de/justvotes/bootstrap/config/SessionValidationFilter.java`: for authenticated requests load account by id, invalidate session and respond `401` if account missing, `LOCKED`, `sessionEpoch` differs or login instant older than 12 h; otherwise set request attribute `AuthenticatedAccount` (research R4)
- [X] T038 [US1] Rewrite `SecurityFilterChain` in `bootstrap/src/main/java/de/justvotes/bootstrap/config/SecurityConfiguration.java`: `permitAll` for `/api/v1/csrf`, `POST /api/v1/session/login`, `POST /api/v1/invitations/**`, actuator health, `/config.js`, static assets and SPA fallback; `authenticated()` for `/api/v1/session/**`, `/api/v1/polls/**`, `/api/v1/identity/**`, `/api/v1/admin/**`, `/api-docs/**`, `/swagger-ui/**` (role restrictions follow in US3); `denyAll` for any other `/api/v1/**`; register `SessionValidationFilter`; remove `UserDetailsService systemAdmin` and the old `AuthenticationManager`
- [X] T039 [US1] Remove `changeIdentity` from `poll-management/src/main/java/de/justvotes/pollmanagement/core/ports/in/ManageVotes.java` and `VoteManagement.java`, delete `poll-management/src/main/java/de/justvotes/pollmanagement/core/event/VoteRemovedForIdentityChange.java`, adjust `adapters/src/main/java/de/justvotes/adapters/pollmanagement/infra/in/transaction/TransactionalVoteManagement.java`
- [X] T040 [US1] Change `adapters/src/main/java/de/justvotes/adapters/pollmanagement/infra/in/http/PublicPollController.java` and `IdentityController.java` to derive `Identity` from `AuthenticatedAccounts.current(request).identity()`; remove `currentIdentity`/`changeIdentity` operations and cookie parsing; delete `IdentityCookieCodec.java`; use `AuthenticatedAccounts.current(request).accountName()` as `createdBy`/`actorId` in `PollController.java` and `AdministrativeVoteController.java`
- [X] T041 [P] [US1] Frontend API client in `frontend/src/shared/api/client.ts`: add `login`, `logout`, `getSession`; remove `getIdentity`, `changeIdentity`, `getAdminSession` and admin login/logout calls; in `frontend/src/shared/api/queryKeys.ts` add `session`, remove `identity` and `adminSession`; on any `401` call `sessionCoordinator.requireLogin` and invalidate `queryKeys.session`; adapt `frontend/src/shared/api/client.test.ts`
- [X] T042 [P] [US1] Create `frontend/src/features/auth/sessionQueries.ts` (`useSessionQuery` treating `401` as „anonymous“, exposing `accountName`, `role`, `identity`, `passwordChangeRequired`) and `frontend/src/features/auth/LoginPage.tsx` (accessible form with labels, `aria-live` error region, uniform error text, throttle message with seconds from `Retry-After`)
- [X] T043 [US1] Add authentication gate to `frontend/src/app/App.tsx`: anonymous → only `/login` (and `/invitation` later), every other path redirects to `/login` and stores return route via `sessionCoordinator`; after login navigate to return route, otherwise `/admin` for role `admin` and `/polls` for role `user`
- [X] T044 [US1] Switch admin area to the common session (analysis I2): in `frontend/src/features/admin/AdminPage.tsx` replace `verifyAdminSession`/`queryKeys.adminSession` with `useSessionQuery`, remove the `AdminAccess` login mode and its login form (anonymous users never reach this route); in `frontend/src/app/Header.tsx` replace `useShellNavigation`'s `verifyShellAdminSession`/`apiClient.getAdminSession` with `useSessionQuery` (navigation mode `admin` when on `/admin*` and session present)
- [X] T045 [US1] Remove identity UI: delete `frontend/src/shared/ui/IdentityDialog.tsx`, `IdentityEditor.tsx`, `IdentityEditor.test.tsx`, `identityActionKey.ts`, `identityActionKey.test.ts`; in `frontend/src/app/Header.tsx` show account name/identity read-only and a logout button instead of `IdentityEditor`; remove identity prompts from `frontend/src/features/polls/PollPage.tsx` and `frontend/src/features/home/HomePage.tsx`; adapt `frontend/src/features/profile/ProfilePage.tsx` (no „no identity“ state) and tests `HomePage.test.tsx`, `PollRoutes.integration.test.tsx`, `ProfilePage.test.tsx`
- [X] T046 [US1] Add login/logout texts (de/en) to `frontend/src/shared/i18n/translations.ts` and remove obsolete identity-dialog and admin-login keys

**Checkpoint**: Anmeldepflicht aktiv, alle melden sich gleich an, User stimmen
unter Kontoidentität ab, Frontend baut und typprüft

---

## Phase 4: User Story 2 – Per Einladung ein Konto anlegen (Priority: P1)

**Goal**: Administrator lädt per E-Mail ein; Person vervollständigt Konto über
Link (Name, Identität, Passwort) und ist danach als User angemeldet.

**Independent Test**: Einladung anlegen, Mail im Test-Mailer abfangen, Link
öffnen, Konto vervollständigen, anmelden; zweiter Linkaufruf abgelehnt.

### Tests for User Story 2 ⚠️

- [X] T047 [P] [US2] Unit tests `account-management/src/test/java/de/justvotes/accountmanagement/core/model/InvitationTest.java`: `issue` sets `expiresAt = issuedAt + 7 Tage`; effective status `EXPIRED` when `now ≥ expiresAt`; `reissue` replaces token hash and resets `deliveryFailed`; `revoke` only from `OPEN`; `accept` only `OPEN`, not expired, matching hash
- [X] T048 [P] [US2] Unit tests `account-management/src/test/java/de/justvotes/accountmanagement/core/InvitationManagementTest.java`: invite rejects email with open invitation or existing account (`EmailAlreadyInvitedException`); accept rejects taken name/identity (case-insensitive) and leaves invitation `OPEN`; accept creates `USER` account
- [X] T049 [P] [US2] HTTP test `bootstrap/src/test/java/de/justvotes/bootstrap/InvitationHttpTest.java` using an in-memory `InvitationMailer` test bean: `POST /admin/invitations` `201` + mail with link `${PUBLIC_BASE_URL}/invitation#token=…`; `POST /invitations/inspection` `200 {email, expiresAt}`; `POST /invitations/acceptance` `200 CurrentSession` and session cookie; reuse → `409 invitation-not-usable`; with existing session → `409 already-authenticated`; resend invalidates old token; `DELETE` revokes; mail failure sets `deliveryFailed`; without `MAIL_HOST` or `PUBLIC_BASE_URL` → `409 invitation-delivery-unavailable`
- [X] T050 [P] [US2] Frontend tests `frontend/src/features/auth/InvitationPage.test.tsx` (token read from hash, kept in `sessionStorage` and removed from URL; validation; unusable invitation state; with active session the page shows the „angemeldet als … – bitte abmelden“ hint with logout button and no inspection request, after logout it inspects the stored token; token removed from `sessionStorage` after acceptance or rejection) and `frontend/src/features/admin/InvitationAdministration.test.tsx`
- [X] T051 [P] [US2] Component-level E2E scenario „invite and complete account“ in `frontend/e2e/auth.spec.ts` using Playwright route mocks for `POST /api/v1/invitations/inspection` and `/acceptance` (token from the mocked invitation link) plus axe check on the invitation page; the real end-to-end flow is covered by T049 (analysis T1)

### Implementation for User Story 2

- [X] T052 [US2] Extend `api-contract/src/main/openapi/justvotes-v1.yaml` with tag `Invitations`: `POST /invitations/inspection`, `POST /invitations/acceptance` (`security: []` + CSRF), `GET/POST /admin/invitations`, `POST /admin/invitations/{invitationId}/resend`, `DELETE /admin/invitations/{invitationId}`; schemas `InvitationTokenRequest`, `InvitationPreview`, `InvitationAcceptance`, `InvitationRequest`, `InvitationSummary` (`status` enum `[open, expired, accepted, revoked]`, `deliveryFailed`) and problem codes from contracts/openapi-delta.md
- [X] T053 [P] [US2] Create `InvitationId`, `InvitationToken`, `InvitationTokenHash` (SHA-256 hex), `InvitationStatus {OPEN, ACCEPTED, REVOKED}` and aggregate `Invitation` in `account-management/src/main/java/de/justvotes/accountmanagement/core/model/` per data-model.md
- [X] T054 [P] [US2] Create out-ports `InvitationRepository`, `InvitationMailer` (`isAvailable()`, `send(EmailAddress, String link, Instant expiresAt, Locale)`), `TokenGenerator` in `account-management/src/main/java/de/justvotes/accountmanagement/core/ports/out/`
- [X] T055 [US2] Create in-ports `ManageInvitations` (`invite`, `resend`, `revoke`, `list`) and `AcceptInvitation` (`inspect`, `accept`) with service `InvitationManagement` in `account-management/src/main/java/de/justvotes/accountmanagement/core/`; uniqueness checks on normalized name, identity and email; `invite` rejects when `InvitationMailer.isAvailable()` is false
- [X] T056 [P] [US2] Create `InvitationEntity`, `SpringDataInvitationRepository`, `JpaInvitationPersistenceAdapter` in `adapters/src/main/java/de/justvotes/adapters/accountmanagement/infra/out/persistence/`
- [X] T057 [P] [US2] Create `SecureRandomTokenGenerator` (32 Byte, Base64url; one-time password 16 chars without `0O1lI`) in `adapters/src/main/java/de/justvotes/adapters/accountmanagement/infra/out/security/SecureRandomTokenGenerator.java` (JDK only)
- [X] T058 [P] [US2] Create `SmtpInvitationMailer` in `bootstrap/src/main/java/de/justvotes/bootstrap/config/SmtpInvitationMailer.java` (own `JavaMailSenderImpl` configured from `justvotes.mail.host`, `spring.mail.port/username/password`, STARTTLS flag; plain-text de/en; sender `justvotes.mail.from`; link `${justvotes.public-base-url}/invitation#token=<token>`) and `UnavailableInvitationMailer` (`isAvailable() = false`) in the same package (research R7, analysis C1)
- [X] T059 [US2] Create `TransactionalInvitationManagement` in `adapters/src/main/java/de/justvotes/adapters/accountmanagement/infra/in/transaction/` (send mail after commit, mark `deliveryFailed` on exception) and `AdminInvitationController` in `adapters/src/main/java/de/justvotes/adapters/accountmanagement/infra/in/http/` logging `invitation-issued`, `invitation-resent`, `invitation-revoked` via `SecurityEventLogger` (analysis I1); map exceptions to Problem Details in `adapters/src/main/java/de/justvotes/adapters/shared/infra/in/http/ApiExceptionHandler.java`
- [X] T060 [US2] Create `InvitationAcceptanceController` in `bootstrap/src/main/java/de/justvotes/bootstrap/InvitationAcceptanceController.java`: inspection and acceptance; on success establish session exactly like `SessionController.login`; reject when already authenticated; log `invitation-accepted`
- [X] T061 [US2] Wire invitation ports in `bootstrap/src/main/java/de/justvotes/bootstrap/config/AccountManagementConfiguration.java`: register `SmtpInvitationMailer` only when `justvotes.mail.host` and `justvotes.public-base-url` are non-blank, otherwise `UnavailableInvitationMailer`
- [X] T062 [P] [US2] Create `frontend/src/features/auth/InvitationPage.tsx` (research R13): on first render read `token` from `location.hash`, store it in `sessionStorage` (key `justvotes.invitationToken`) and remove it from the URL via `history.replaceState`; with active session (`useSessionQuery`) show the hint „angemeldet als `Kontoname` – zum Annehmen bitte abmelden“ with a logout button and do not call inspection; without session call `/invitations/inspection` with the stored token and show the form for Kontoname, Identität, Passwort + Wiederholung with inline validation; error state for unusable invitation with link to `/login`; delete the stored token after acceptance or `invitation-not-usable`; register route `/invitation` in `frontend/src/app/App.tsx` for both anonymous and authenticated users (never redirected)
- [X] T063 [P] [US2] Create `frontend/src/features/admin/InvitationAdministration.tsx` (list with status badges incl. delivery failure, invite form, resend, revoke with confirmation) and `frontend/src/features/admin/invitationQueries.ts`; add section `invitations` to `frontend/src/features/admin/AdminPage.tsx`
- [X] T064 [US2] Add invitation texts (de/en) to `frontend/src/shared/i18n/translations.ts`

**Checkpoint**: Neue Personen können per Einladung ein Konto anlegen

---

## Phase 5: User Story 3 – Berechtigungen über Rollen steuern (Priority: P1)

**Goal**: Nur der Administrator sieht und nutzt die Administration und API-Doku;
User nur Abstimmungen; Administrator stimmt nicht ab.

**Independent Test**: User-Konto ohne Admin-Menü und `403` auf `/admin/**`
und API-Doku; Administrator mit Admin-Menü, `403` auf `/polls/**` und
`/identity/votes`.

### Tests for User Story 3 ⚠️

- [X] T065 [P] [US3] HTTP test `bootstrap/src/test/java/de/justvotes/bootstrap/RoleAuthorizationHttpTest.java`: parameterized over every contract operation — user: `/admin/**` and (with `API_DOCS_ENABLED=true`) `/api-docs/**`, `/swagger-ui/**` → `403 access-denied`; admin: `/polls/**`, `/identity/votes` → `403 access-denied`, API docs `200`; both allowed on `/session/**`
- [X] T066 [P] [US3] Frontend tests in `frontend/src/app/App.test.tsx` and `frontend/src/app/Header.test.tsx`: admin sees admin navigation only and `/` redirects to `/admin`; user sees polls/profile only and `/admin` redirects to `/polls`
- [X] T067 [P] [US3] E2E scenario „admin sees only administration“ in `frontend/e2e/auth.spec.ts`

### Implementation for User Story 3

- [X] T068 [US3] Restrict in `bootstrap/src/main/java/de/justvotes/bootstrap/config/SecurityConfiguration.java`: `hasRole('USER')` for `/api/v1/polls/**` and `/api/v1/identity/**`; `hasRole('ADMIN')` for `/api/v1/admin/**`, `/api-docs/**`, `/swagger-ui/**` (research R9, analysis K1)
- [X] T069 [US3] Document role per operation in `api-contract/src/main/openapi/justvotes-v1.yaml` (operation descriptions „requires role user/admin“, `403` responses on `/polls/**` and `/identity/votes`)
- [X] T070 [US3] Make navigation role-based in `frontend/src/app/Header.tsx` and `frontend/src/app/App.tsx` using `useSessionQuery().data.role`: admin → only `/admin/*` and `/password`; user → `/polls`, `/poll/*`, `/profile`, `/password`; `/` and disallowed paths redirect by role; `/invitation` is exempt from role redirects for both roles (research R13)

**Checkpoint**: Rollenmodell durchgesetzt in API und UI

---

## Phase 6: User Story 4 – Eigenes Passwort selbst verwalten (Priority: P2)

**Goal**: Angemeldete Konten ändern ihr Passwort; andere Sitzungen enden.

**Independent Test**: Passwort ändern; altes Passwort `401`, neues `200`;
zweite Sitzung danach `401`.

### Tests for User Story 4 ⚠️

- [X] T071 [P] [US4] Unit tests in `account-management/src/test/java/de/justvotes/accountmanagement/core/model/AccountTest.java`: `changePassword` requires correct current password, rejects new = current, sets `passwordChangeRequired=false`, increments `sessionEpoch`
- [X] T072 [P] [US4] HTTP test `bootstrap/src/test/java/de/justvotes/bootstrap/PasswordChangeHttpTest.java`: `PUT /session/password` `204`; current session keeps working; second session `401`; wrong current → `422 current-password-invalid`; short new → `422 password-policy-violation`
- [X] T073 [P] [US4] Frontend test `frontend/src/features/auth/PasswordChangePage.test.tsx` and E2E scenario „change password, other browser context logged out“ in `frontend/e2e/auth.spec.ts`

### Implementation for User Story 4

- [X] T074 [US4] Add `PUT /session/password` with schema `PasswordChange {currentPassword, newPassword}` and `422` responses to `api-contract/src/main/openapi/justvotes-v1.yaml`
- [X] T075 [US4] Add `Account.changePassword(Password current, Password next, PasswordHasher)` and in-port `ManageOwnCredentials` with service in `account-management/src/main/java/de/justvotes/accountmanagement/core/`
- [X] T076 [US4] Implement `changePassword` in `bootstrap/src/main/java/de/justvotes/bootstrap/SessionController.java`: update stored `sessionEpoch` in current session after success, log `password-changed`
- [X] T077 [P] [US4] Create `frontend/src/features/auth/PasswordChangePage.tsx` (route `/password`, current/new/repeat, policy hint „mindestens 12 Zeichen“, success toast) and link from `frontend/src/app/Header.tsx`; texts in `frontend/src/shared/i18n/translations.ts`

**Checkpoint**: Selbstverwaltete Anmeldedaten verfügbar

---

## Phase 7: User Story 5 – Konten durch den Administrator verwalten (Priority: P3)

**Goal**: Administrator listet Konten, sperrt/entsperrt User-Konten, setzt
Einmalpasswort; Passwortwechsel danach erzwungen.

**Independent Test**: User sperren → Sitzung endet, Login abgelehnt;
entsperren + Einmalpasswort → Login erzwingt `/password`.

### Tests for User Story 5 ⚠️

- [X] T078 [P] [US5] Unit tests in `account-management/src/test/java/de/justvotes/accountmanagement/core/model/AccountTest.java`: `lock` only `USER`+`ACTIVE`, increments epoch; `unlock` only `LOCKED`; `assignOneTimePassword` only `USER`, sets `passwordChangeRequired=true`, increments epoch; admin → `AccountNotManageableException`
- [X] T079 [P] [US5] HTTP test `bootstrap/src/test/java/de/justvotes/bootstrap/AccountAdministrationHttpTest.java`: `GET /admin/accounts`; lock ends running user session and blocks login with `401 invalid-credentials`; unlock; one-time password returned once; login with it → all endpoints except `/session/**` return `403 password-change-required`; admin self-lock → `409 account-not-manageable`
- [X] T080 [P] [US5] Frontend test `frontend/src/features/admin/AccountAdministration.test.tsx` and test in `frontend/src/app/App.test.tsx` that `passwordChangeRequired` forces `/password`

### Implementation for User Story 5

- [X] T081 [US5] Add `GET /admin/accounts`, `POST /admin/accounts/{accountId}/lock`, `/unlock`, `/one-time-password`, schemas `AccountSummary`, `OneTimePassword` and code `account-not-manageable` to `api-contract/src/main/openapi/justvotes-v1.yaml`
- [X] T082 [US5] Add `lock`, `unlock`, `assignOneTimePassword` to `Account` and in-ports `ManageAccounts`, `ViewAccounts` with service in `account-management/src/main/java/de/justvotes/accountmanagement/core/`
- [X] T083 [US5] Create `TransactionalAccountManagement` in `adapters/src/main/java/de/justvotes/adapters/accountmanagement/infra/in/transaction/` and `AdminAccountController` in `adapters/src/main/java/de/justvotes/adapters/accountmanagement/infra/in/http/` (opaque ids prefix `a` via `OpaqueIdCodec`); log `account-locked`, `account-unlocked`, `one-time-password-set` via `SecurityEventLogger`
- [X] T084 [US5] Enforce `passwordChangeRequired` in `bootstrap/src/main/java/de/justvotes/bootstrap/config/SessionValidationFilter.java`: all `/api/v1/**` except `/api/v1/session/**` and `/api/v1/csrf` → `403 password-change-required`
- [X] T085 [P] [US5] Create `frontend/src/features/admin/AccountAdministration.tsx` and `frontend/src/features/admin/accountQueries.ts` (table with name, identity, email, status; lock/unlock with confirmation; one-time password shown once in a dialog with copy button); add section `accounts` to `frontend/src/features/admin/AdminPage.tsx`
- [X] T086 [US5] Redirect to `/password` when `passwordChangeRequired` in `frontend/src/app/App.tsx`; texts in `frontend/src/shared/i18n/translations.ts`

**Checkpoint**: Alle User Stories funktionsfähig

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T087 [P] Update `README.md`: replace „System Administrator Session“ with login for all accounts, document `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM`, `MAIL_STARTTLS`, `PUBLIC_BASE_URL`, `ADMIN_PASSWORD_RESET`, API docs only for admin, one-time vote deletion on upgrade (backup hint), Docker examples
- [X] T088 [P] Accessibility and responsive review of `frontend/src/features/auth/LoginPage.tsx`, `InvitationPage.tsx`, `PasswordChangePage.tsx`, `frontend/src/features/admin/AccountAdministration.tsx`, `InvitationAdministration.tsx` (360 px, keyboard only, visible focus, live regions); axe checks in `frontend/e2e/auth.spec.ts`
- [X] T089 [P] Verify no password, token or hash appears in logs or responses: test `bootstrap/src/test/java/de/justvotes/bootstrap/SecurityEventLoggingTest.java` capturing `justvotes.security` output for every event listed in T021; a failed login whose name field contains a password-like string for a non-existing account logs only `nameFingerprint`, never the entered text (FR-032, SC-008, research R12)
- [X] T090 Remove leftover references to the `userID` cookie, `adminSession`, `IdentityCookieCodec`, `/admin/login` and the event type `VoteRemovedForIdentityChange` across `frontend/src` (incl. `frontend/src/features/polls/AuditPage.tsx` and audit labels in `frontend/src/shared/i18n/translations.ts`) and `bootstrap/src/test` (analysis G1)
- [X] T091 Run full quality gates: `mvn -s .mvn/settings.xml test`; in `frontend/`: `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:e2e`; contract typecheck in `api-contract/typescript-contract`; `docker build -t justvotes .` and container start without `MAIL_HOST`
- [X] T092 Run manual scenarios 1–14 incl. 4a and 12a from `specs/006-local-user-auth/quickstart.md` with Mailpit (API-gestützt gegen Container + Mailpit; 4a, 7 und 14 über E2E-/Migrationstests abgedeckt)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: keine Abhängigkeiten
- **Foundational (Phase 2)**: nach Setup – blockiert alle Stories
- **US1 (Phase 3)**: nach Foundational – liefert Login, Sitzungsfilter,
  Security-Kette und die auf `useSessionQuery` umgestellte Admin-Oberfläche,
  auf denen alle weiteren Stories aufbauen
- **US2, US3 (Phase 4, 5)**: nach US1; fachlich unabhängig. Beide ändern
  `justvotes-v1.yaml`, `App.tsx` (US2: Route `/invitation` für beide Zustände;
  US3: Rollenrouting mit Ausnahme `/invitation`) und US3
  `SecurityConfiguration.java` – nacheinander mergen
- **US4 (Phase 6)**: nach US1; unabhängig von US2/US3
- **US5 (Phase 7)**: nach US1; nutzt Passwortseite aus US4 für den erzwungenen
  Wechsel (T086 nach T077)
- **Polish (Phase 8)**: nach allen gewünschten Stories

### Within Each User Story

- Tests zuerst, müssen fehlschlagen
- Vertrag (`justvotes-v1.yaml`) und Regenerierung vor Controllern und Frontend-Client
- Domänenmodell → Ports/Service → Persistenz → Controller → Frontend
- In US1: T041 (Client) vor T043, T044, T045, damit `pnpm typecheck` am Ende der
  Phase grün ist (analysis I2)

### Parallel Opportunities

- Setup: T002, T004, T005 parallel nach T001
- Foundational: Tests T006–T011 parallel; T012, T014, T015, T018, T020, T021, T023 parallel
- US1: Tests T024–T031 parallel; T034, T035 parallel; T041, T042 parallel
- US2: T047–T051 parallel; T053, T054 parallel; T056, T057, T058 parallel; T062, T063 parallel
- Nach US1 können US2, US3 und US4 von verschiedenen Personen parallel bearbeitet werden

---

## Parallel Example: User Story 1

```bash
# Tests gemeinsam starten:
Task: "HTTP test SessionHttpTest in bootstrap/src/test/java/de/justvotes/bootstrap/SessionHttpTest.java"
Task: "HTTP test AnonymousAccessHttpTest in bootstrap/src/test/java/de/justvotes/bootstrap/AnonymousAccessHttpTest.java"
Task: "HTTP test LoginThrottleHttpTest in bootstrap/src/test/java/de/justvotes/bootstrap/LoginThrottleHttpTest.java"
Task: "Frontend LoginPage.test.tsx in frontend/src/features/auth/"

# Unabhängige Implementierungen:
Task: "Authenticate port and service in account-management/src/main/java/de/justvotes/accountmanagement/core/"
Task: "LoginThrottle in bootstrap/src/main/java/de/justvotes/bootstrap/config/LoginThrottle.java"
Task: "API client session calls in frontend/src/shared/api/client.ts"
Task: "LoginPage and sessionQueries in frontend/src/features/auth/"
```

## Parallel Example: User Story 2

```bash
Task: "Invitation aggregate in account-management/src/main/java/de/justvotes/accountmanagement/core/model/"
Task: "Invitation out-ports in account-management/src/main/java/de/justvotes/accountmanagement/core/ports/out/"
Task: "SmtpInvitationMailer in bootstrap/src/main/java/de/justvotes/bootstrap/config/"
Task: "InvitationPage in frontend/src/features/auth/InvitationPage.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 + Phase 2
2. Phase 3 (US1): Anmeldepflicht und Abstimmen unter Kontoidentität; Konten
   zunächst über `AccountFixtures` (Tests) und das Administratorkonto
3. **STOP and VALIDATE**: Quickstart-Szenarien 1, 5, 7, 8, 12 (Health)
4. Hinweis: Produktiv nutzbar für weitere Personen erst mit US2 (Einladung)

### Incremental Delivery

1. Setup + Foundational
2. US1 → validieren (MVP)
3. US2 → Einladungen; ab hier produktiv einsetzbar
4. US3 → Rollen in API und UI vollständig, API-Doku nur für Admin
5. US4 → Passwortänderung
6. US5 → Kontoverwaltung, Einmalpasswort
7. Polish

---

## Notes

- [P] = andere Dateien, keine Abhängigkeiten
- Änderungen an `justvotes-v1.yaml` erfolgen pro Story inkrementell; nach jeder
  Änderung Generatoren laufen lassen, generierte Quellen nicht committen
- Commit nach jeder Task oder logischen Gruppe
