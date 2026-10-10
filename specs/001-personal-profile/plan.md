# Implementation Plan: Personal Profile

**Branch**: `001-personal-profile` | **Date**: 2026-09-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-personal-profile/spec.md`

## Summary

Add a read-only personal profile that obtains the current identity and its
current votes in one public request. The backend will expose a new
parameterless identity-scoped read operation backed by the existing poll
aggregate and public visibility rules. The React/Vite frontend will add a
profile route, query it with React Query, and reuse the existing identity
editor, UI state components, translations, and styling conventions.

The design deliberately avoids composing the existing public-poll and
poll-results requests: that would cause one request per poll, expose unrelated
voters to the client, and omit publicly readable archived polls.

## Technical Context

**Language/Version**: Backend Java 21; Spring Boot 3.4.2; frontend TypeScript
5.7.3, React 19, Vite 6.1.0

**Primary Dependencies**: Existing Maven modules, Spring Data JPA, SQLite,
Flyway, OpenAPI Generator 7.12.0, React Router 7, TanStack React Query 5,
Vitest, Testing Library, and Playwright

**Storage**: Existing SQLite/JPA schema. No new tables or migration are
required; the existing persisted current votes and poll lifecycle are reused.

**Testing**: JUnit 5 domain tests, Spring Boot random-port HTTP tests, OpenAPI
contract tests and generated-client typechecking; Vitest/Testing Library unit
tests, Playwright browser tests, and the existing Docker build/runtime smoke
checks from CI on both `linux/amd64` and `linux/arm64`

**Target Platform**: Spring Boot executable JAR/container on the existing
Linux deployment target, plus the existing desktop and mobile-capable browser
SPA

**Project Type**: Same-origin web application with a Spring Boot backend and
React/Vite frontend

**Performance Goals**: One profile read request per page load; no
per-poll/N+1 client requests. No new latency or throughput SLA is introduced;
the existing bounded SQLite connection pool and CI smoke checks remain the
baseline. The browser test must verify one profile request and no per-poll
profile requests.

**Constraints**: Resolve identity only from the existing HttpOnly `userID`
cookie; accept no identity parameter or body; return `Cache-Control: no-store`;
expose only public readable polls and the current matching vote; preserve
session/CSRF behavior, the OpenAPI-first workflow, generated-source rules,
accessibility, responsive layout, and internationalization.

Malformed identity cookies use the same safe empty response as a missing cookie;
a valid identity with no matching current vote remains a distinct frontend
empty state.

**Scale/Scope**: One new backend read model and read operation, one versioned
API operation, one public frontend route, and focused tests. No change to
`template-catalog`, authentication, database schema, or deployment.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Hexagonal Domain Core**: PASS. The query is added to the existing
  `ViewVotes` input port and implemented in the domain service; HTTP and
  transaction handling stay in adapters.
- **Contract-First API**: PASS. The versioned OpenAPI contract is updated as
  the source of the generated server interface and TypeScript types. Generated
  files remain unedited and uncommitted.
- **Explicit Domain Models and Boundaries**: PASS. A small immutable domain
  read model carries the enriched poll, option, and vote timestamp; visibility,
  identity matching, and option validity remain domain rules.
- **Feature-Oriented React Frontend**: PASS. Profile UI stays under
  `frontend/src/features/profile`, uses the central API client and React Query,
  and keeps derived ordering separate from the page component.
- **Testable Changes and Quality Gates**: PASS. Domain, HTTP, contract,
  frontend unit, browser compatibility, and container smoke coverage are
  planned; existing CI commands remain the completion gate.
- **Additional Constraints**: PASS. No migration or new dependency is needed;
  the public GET does not weaken session or CSRF protection, and the response
  is explicitly non-cacheable.
- **Development Workflow**: PASS. Existing module boundaries, generated
  sources, translations, accessibility patterns, and established commands are
  reused.

## Project Structure

### Documentation (this feature)

```text
specs/001-personal-profile/
├── plan.md              # This file
├── research.md          # Phase 0 design research
├── data-model.md        # Phase 1 data model
├── quickstart.md        # Phase 1 validation guide
├── contracts/
│   └── identity-votes.md # Phase 1 API contract design
└── tasks.md             # Phase 2 implementation task list
```

### Source Code (repository root)

```text
api-contract/src/main/openapi/justvotes-v1.yaml
poll-management/src/main/java/de/justvotes/pollmanagement/core/
├── VoteManagement.java
├── model/PersonalVote.java
└── ports/in/ViewVotes.java
adapters/src/main/java/de/justvotes/adapters/pollmanagement/infra/
├── in/http/IdentityController.java
└── in/transaction/TransactionalVoteManagement.java
bootstrap/src/main/java/de/justvotes/bootstrap/config/
└── PollManagementConfiguration.java
poll-management/src/test/java/de/justvotes/pollmanagement/core/
└── VoteManagementTest.java
bootstrap/src/test/java/de/justvotes/bootstrap/
├── PollManagementHttpTest.java
└── CsrfSessionOpenApiContractTest.java
frontend/src/
├── app/App.tsx
├── app/Header.tsx
├── app/styles.css
├── features/profile/
│   ├── ProfilePage.tsx
│   ├── ProfilePage.test.tsx
│   ├── profileQueries.ts
│   ├── profileProjections.ts
│   └── profileProjections.test.ts
├── features/polls/pollCommands.test.ts
├── shared/api/
│   ├── client.ts
│   └── queryKeys.ts
├── shared/i18n/translations.ts
└── shared/ui/IdentityEditor.tsx
frontend/e2e/
├── app-shell.spec.ts
└── profile.spec.ts
```

**Structure Decision**: Keep the existing Maven multi-module hexagonal backend
and the existing feature-oriented frontend. The new backend read operation
belongs to poll management because it reads current `Vote` values and poll
lifecycle visibility. `IdentityController` remains the HTTP entry point for
identity-scoped operations. The frontend gets a focused `profile` feature and
reuses shared API, identity, query-state, i18n, and styling infrastructure.

## Complexity Tracking

No constitution violations. No complexity exception is required.
