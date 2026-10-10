---

description: "Task list for Personal Profile"
---

# Tasks: Personal Profile

**Input**: Design documents from `/specs/001-personal-profile/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/`, and `quickstart.md`

**Tests**: Test tasks are included because the feature specification and project
constitution require domain, contract, frontend, and end-to-end coverage.

**Organization**: Tasks are grouped by user story. User Story 1 is the MVP;
User Stories 2 and 3 extend the same profile incrementally.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it uses different files and has no dependency on incomplete work
- **[Story]**: Maps a task to `US1`, `US2`, or `US3` from `spec.md`
- Every task includes the concrete repository path it changes or validates

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm that the existing project setup is sufficient. No new
module, dependency, migration, or framework is needed for this feature.

- [X] T001 [P] Confirm the existing Java 21, Spring Boot, Node.js 22, pnpm 10.6.1, Maven module, and frontend script setup in `pom.xml`, `frontend/package.json`, and `.github/workflows/ci.yml`; do not add dependencies or modules.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the versioned contract and generated types required by
both backend and frontend work.

**Checkpoint**: The contract source and generated interfaces/types are
available; generated files remain unedited and uncommitted.

- [X] T002 Update `api-contract/src/main/openapi/justvotes-v1.yaml` with parameterless `GET /identity/votes` (`currentIdentityVotes`): nullable `userID`, required `votes` array, poll `id/title/state` where `state` is restricted to wire values `active`, `expired`, or `archived`, option `number/text`, UTC `votedAt`, no identity input, public access, `200` with `userID: null` and `votes: []` for absent or malformed identity, and `Cache-Control: no-store`.
- [X] T003 Regenerate server interfaces/DTOs and the TypeScript contract client from `api-contract/src/main/openapi/justvotes-v1.yaml` using the existing Maven and frontend generation commands; verify outputs under `api-contract/target/generated-sources/` and `frontend/src/shared/api/generated/` are not manually edited or committed.

---

## Phase 3: User Story 1 - Eigene Abstimmungsübersicht ansehen (Priority: P1) - MVP

**Goal**: A person with a current identity can open the public personal
profile and see only that identity's current votes in publicly readable polls,
with the poll title/state, selected option, and vote timestamp.

**Independent Test**: With an identity holding current votes in at least two
publicly readable polls, the profile response and page contain exactly those
entries, no other identity's data, and the required fields.

### Tests for User Story 1

- [X] T004 [P] [US1] Extend `bootstrap/src/test/java/de/justvotes/bootstrap/CsrfSessionOpenApiContractTest.java` with contract assertions for `GET /identity/votes`, its parameterless request, public/no-CSRF declaration, nullable `userID`, required vote fields, and no-store response documentation.
- [X] T005 [P] [US1] Extend `poll-management/src/test/java/de/justvotes/pollmanagement/core/VoteManagementTest.java` with fixed-clock domain cases for exact identity isolation, public `ACTIVE`/`EXPIRED`/`ARCHIVED` inclusion, private/draft/deleted exclusion, invalid option omission, newest-vote-first ordering, and expiry-on-read.
- [X] T006 [P] [US1] Extend `bootstrap/src/test/java/de/justvotes/bootstrap/PollManagementHttpTest.java` with cookie-scoped profile cases for absent/malformed identity returning the identity-empty response, two identities with disjoint votes, minimal response fields, opaque poll IDs, no-store, and no cookie side effects.
- [X] T007 [P] [US1] Create `frontend/src/features/profile/profileProjections.test.ts` covering deterministic newest-vote-first ordering with poll-ID tie breaking and the projection of poll, option, lifecycle, and timestamp labels.
- [X] T008 [P] [US1] Create `frontend/src/features/profile/ProfilePage.test.tsx` covering the populated profile view, required personal vote fields, profile query loading/error/empty handling, and the absence of unrelated identity data.
- [X] T009 [P] [US1] Create `frontend/e2e/profile.spec.ts` covering public profile access without admin login, exactly one `GET /api/v1/identity/votes` request with no per-poll requests, the current-identity response, populated personal entries, no full voter-list exposure, and supported narrow-viewport accessibility.

### Implementation for User Story 1

- [X] T010 [P] [US1] Create immutable `PersonalVote` in `poll-management/src/main/java/de/justvotes/pollmanagement/core/model/PersonalVote.java` with required poll ID/title/state, option number/text, and `Instant votedAt`; restrict poll state to `ACTIVE`, `EXPIRED`, or `ARCHIVED` and require an existing option reference.
- [X] T011 [US1] Extend `poll-management/src/main/java/de/justvotes/pollmanagement/core/ports/in/ViewVotes.java` with a current-votes query accepting only the existing `Identity` value object and returning `PersonalVote` entries.
- [X] T012 [US1] Implement the current-votes query in `poll-management/src/main/java/de/justvotes/pollmanagement/core/VoteManagement.java` using existing poll data, exact `Identity` equality, `Poll.isPubliclyReadable()`, omission of unresolved options, expiry-on-read with the existing lifecycle event, and deterministic newest-vote-first ordering with poll ID tie breaking.
- [X] T013 [US1] Delegate the new query in `adapters/src/main/java/de/justvotes/adapters/pollmanagement/infra/in/transaction/TransactionalVoteManagement.java` through the existing transaction executor so expiry-on-read can persist lifecycle changes.
- [X] T014 [US1] Extend `adapters/src/main/java/de/justvotes/adapters/pollmanagement/infra/in/http/IdentityController.java` with the generated identity-votes operation, safe current-cookie parsing, domain-to-contract mapping, `userID: null`/empty response behavior, and `Cache-Control: no-store` without setting cookies.
- [X] T015 [US1] Wire the qualified `ViewVotes` query into `bootstrap/src/main/java/de/justvotes/bootstrap/config/PollManagementConfiguration.java` while keeping `IdentityController` as the identity HTTP adapter.
- [X] T016 [P] [US1] Add the generated-contract-typed `getCurrentIdentityVotes()` method to `frontend/src/shared/api/client.ts` and add `queryKeys.identityVotes` to `frontend/src/shared/api/queryKeys.ts`; keep same-origin credentials and centralized API access.
- [X] T017 [US1] Create `frontend/src/features/profile/profileQueries.ts` with the existing `useApiQuery` pattern and the `queryKeys.identityVotes` query calling the central API client.
- [X] T018 [US1] Create `frontend/src/features/profile/profileProjections.ts` to derive the display model and deterministic newest-vote-first ordering from generated contract data without adding a second server-state store.
- [X] T019 [US1] Create `frontend/src/features/profile/ProfilePage.tsx` using `PageFrame`, `QueryState`, `RouteState`, the profile query, and existing UI conventions to present the current identity and each poll title/state, selected option, and UTC timestamp without exposing technical IDs or unrelated voters.
- [X] T020 [P] [US1] Register the `/profile` route in `frontend/src/app/App.tsx` and preserve the existing fallback behavior for unknown routes.
- [X] T021 [P] [US1] Add the public profile link plus profile route title and back-link context in `frontend/src/app/Header.tsx` without changing admin navigation behavior.
- [X] T022 [P] [US1] Add German and English profile title, field, status, empty, and error translation keys in `frontend/src/shared/i18n/translations.ts`; do not hard-code visible strings in profile components.
- [X] T023 [US1] Add only the profile-specific responsive and accessible layout rules to `frontend/src/app/styles.css`, reusing existing surfaces, focus states, semantic structure, and small-screen breakpoints.

**Checkpoint**: User Story 1 is independently usable and testable with a
set identity and at least one current vote.

---

## Phase 4: User Story 2 - Fehlende Identität verstehen und setzen (Priority: P2)

**Goal**: A person without a current identity sees a distinct, safe empty
state and can reach the existing identity-setting flow; a set identity with no
matching current vote sees an appropriate empty result.

**Independent Test**: With no identity and with an identity that has no current
public vote, the profile page distinguishes both states, reveals no other
identity's data, and offers the existing identity editor where applicable.

### Tests for User Story 2

- [X] T024 [US2] Extend `frontend/src/features/profile/ProfilePage.test.tsx` with separate no-identity and no-current-vote requirement cases, including the existing identity-setting action and the absence of another identity's entries.
- [X] T025 [US2] Extend `frontend/e2e/profile.spec.ts` with browser scenarios for the identity-empty state, the no-vote state, keyboard access to the identity-setting action, and critical accessibility checks.

### Implementation for User Story 2

- [X] T026 [US2] Refine `frontend/src/features/profile/ProfilePage.tsx` so `userID: null` and `userID` with an empty vote list have distinct localized explanations, and the missing-identity state reuses `IdentityEditor` without introducing a second identity mechanism.

**Checkpoint**: User Stories 1 and 2 both provide complete populated and empty
profile experiences.

---

## Phase 5: User Story 3 - Übersicht nach eigener Änderung aktualisieren (Priority: P3)

**Goal**: The profile reflects the current result after a vote is cast,
replaced, withdrawn, or the identity is changed, without retaining entries
from a previous identity.

**Independent Test**: Change, replace, withdraw, and reassign identity in the
existing flows, then re-query the profile and compare the entries with the new
current state.

### Tests for User Story 3

- [X] T027 [US3] Extend `poll-management/src/test/java/de/justvotes/pollmanagement/core/VoteManagementTest.java` and `bootstrap/src/test/java/de/justvotes/bootstrap/PollManagementHttpTest.java` with replacement, withdrawal, identity-change, and current-timestamp profile cases.
- [X] T028 [P] [US3] Create `frontend/src/features/polls/pollCommands.test.ts` covering invalidation of `queryKeys.identityVotes` after cast and withdrawal mutations.
- [X] T029 [US3] Extend `frontend/src/features/profile/ProfilePage.test.tsx` with query refresh cases proving a replacement updates option/timestamp, withdrawal removes the entry, and identity change replaces the profile identity and entries.
- [X] T030 [US3] Extend `frontend/e2e/profile.spec.ts` with end-to-end scenarios for cast/replace/withdraw and identity change followed by profile refresh.

### Implementation for User Story 3

- [X] T031 [P] [US3] Invalidate `queryKeys.identityVotes` after successful identity changes in `frontend/src/shared/ui/IdentityEditor.tsx` alongside the existing identity, public-poll, and poll-query invalidation.
- [X] T032 [P] [US3] Invalidate `queryKeys.identityVotes` after successful cast and withdrawal mutations in `frontend/src/features/polls/pollCommands.ts` while preserving the existing four poll-read invalidations.

**Checkpoint**: All three user stories are independently demonstrable after
the shared profile foundation is present, with User Story 3 keeping data fresh
after every specified personal change.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Integrate the new public route into the existing browser-wide
quality checks and run the repository's established gates.

- [X] T033 [P] Add `/profile` and its `identity/votes` fixture to `frontend/e2e/app-shell.spec.ts` central-route, narrow-viewport, same-origin, and critical accessibility coverage.
- [X] T034 [P] Run the generated contract client typecheck in `api-contract/typescript-contract/` with `npm ci` and `npm run typecheck`; confirm generated sources are reproducible and uncommitted.
- [X] T035 [P] Run the backend quality gate `mvn -s .mvn/settings.xml test` from the repository root and resolve only feature-related failures.
- [X] T036 [P] Run frontend quality gates from `frontend/`: `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:e2e`, and `pnpm test:e2e:all` for the CI browser-compatibility matrix.
- [X] T037 Run the scenarios in `specs/001-personal-profile/quickstart.md`, including no-identity, populated, replacement/withdrawal, identity-change, public-lifecycle, privacy, cache, responsive, and accessibility checks; record any requirement gap before implementation is considered complete.
- [X] T038 [P] Reproduce the existing container quality gate from `.github/workflows/ci.yml` using `Dockerfile` for both `linux/amd64` and `linux/arm64` matrix entries: build each image with `docker buildx build --platform ... --load`, run it with a temporary SQLite volume and the CI admin environment, assert the SPA, public poll, missing-API, health, and readiness responses for each platform, and remove every container and volume.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 has no prerequisite.
- **Foundational (Phase 2)**: T002 depends on T001; T003 depends on T002 and blocks implementation.
- **User Story 1 (Phase 3)**: T004-T023 depend on T003; tests T004-T009 are written before their corresponding implementation tasks.
- **User Story 2 (Phase 4)**: T024-T026 depend on the completed profile foundation in User Story 1.
- **User Story 3 (Phase 5)**: T027-T032 depend on User Story 1 and the profile state behavior from User Story 2.
- **Polish (Phase 6)**: T033-T038 depend on all desired user stories.

### User Story Dependencies

- **User Story 1 (P1)**: No story dependency; this is the MVP.
- **User Story 2 (P2)**: Depends on User Story 1 because it refines the profile page and reuses its query and route.
- **User Story 3 (P3)**: Depends on User Stories 1 and 2 because it updates their shared page and mutation behavior.

### Within Each User Story

- Tests precede implementation for the story.
- The domain read model precedes the domain port implementation.
- The domain port implementation precedes transaction and HTTP adapters.
- Generated contract types precede typed client and page work.
- Shared query/cache changes precede behavior that depends on their invalidation.

### Parallel Opportunities

- T001 can run independently before contract work.
- T004-T009 can run in parallel after T003 because they use different test files.
- T010 can run in parallel with T004-T009; T011-T015 remain sequential in the backend boundary.
- T016, T020, T021, and T022 can run in parallel after T003 where their file dependencies are satisfied; T017-T019 follow the client/query types.
- T031 and T032 can run in parallel because they modify different frontend files.
- T034-T036 can run in parallel after implementation, subject to local tool availability.
- T038 can run in parallel with T034-T036 after implementation, subject to Docker availability.

## Parallel Example: User Story 1

```text
Task: "T004 contract requirements test in bootstrap/src/test/java/de/justvotes/bootstrap/CsrfSessionOpenApiContractTest.java"
Task: "T005 domain requirements test in poll-management/src/test/java/de/justvotes/pollmanagement/core/VoteManagementTest.java"
Task: "T006 HTTP requirements test in bootstrap/src/test/java/de/justvotes/bootstrap/PollManagementHttpTest.java"
Task: "T007 projection requirements test in frontend/src/features/profile/profileProjections.test.ts"
Task: "T008 page requirements test in frontend/src/features/profile/ProfilePage.test.tsx"
Task: "T009 browser requirements test in frontend/e2e/profile.spec.ts"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete T001-T003 to establish the existing-tooling and contract foundation.
2. Complete T004-T023 for the populated personal profile.
3. Stop and validate User Story 1 independently with its domain, HTTP,
   contract, frontend, and browser requirements checks.
4. Proceed to User Story 2 only after the MVP profile contract and route are
   stable.

### Incremental Delivery

1. Deliver User Story 1 as the one-request personal profile MVP.
2. Add User Story 2's distinct identity/no-vote states and existing identity
   editor action.
3. Add User Story 3's mutation invalidation and refresh guarantees.
4. Run the cross-cutting browser, contract, backend, frontend, and quickstart
   gates.

## Notes

- `[P]` tasks modify different files and have no incomplete dependency.
- `[US1]`, `[US2]`, and `[US3]` map each task to a feature story.
- No task adds a Maven/npm dependency, persistence entity, Flyway migration, or authentication rule.
- Generated API sources are outputs only; never edit them directly.
- The custom requirements-quality checklist at `checklists/profile.md` remains reviewer-owned and is not changed by implementation tasks.

## Phase 7: Convergence

- [X] T039 Extend the same-origin shell browser test to visit `/profile` and round the mobile-navigation gap measurement to CSS-pixel precision in `frontend/e2e/app-shell.spec.ts`; rerun the full browser matrix per T033, SC-004 and Constitution V (partial).
- [X] T040 Restore the documented contract typecheck dependencies in `api-contract/typescript-contract/` with installation authorization and rerun `npm ci` plus `npm run typecheck` per T034 and Constitution V (partial).
- [X] T041 Validate the profile quickstart against a live backend and browser, including populated, identity, replacement/withdrawal, lifecycle, privacy and cache scenarios in `specs/001-personal-profile/quickstart.md` per T037 (partial).
- [X] T042 Run both architecture builds and the container runtime smoke checks from `.github/workflows/ci.yml` after the Docker Linux engine is available per T038 and Constitution V (partial).

## Phase 8: Convergence

- [X] T043 Restore the pre-existing malformed-cookie behavior of `GET /identity` in `adapters/src/main/java/de/justvotes/adapters/pollmanagement/infra/in/http/IdentityController.java`, retaining the safe-empty fallback only for the new profile endpoint; rerun backend tests per Constitution II and T014 (unrequested).

Assessment correction for T043: the existing `GET /identity` already used `safeCookieIdentity` and its regression test requires HTTP 200 for malformed cookies. The proposed restriction to only the new endpoint was a false positive. Preserve both endpoints' safe-empty behavior; no change to the existing endpoint is required. Keep the original finding above for traceability.
