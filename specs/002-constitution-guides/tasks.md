# Tasks: Constitution and Development Guides

**Input**: Design documents from `specs/002-constitution-guides/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/documentation-sources.md`, and `quickstart.md`

**Tests**: Documentation quality and repository checks are included because the specification requires verifiable outcomes. No application test files are to be changed.

**Organization**: Tasks are grouped by user story; the custom reviewer checklist remains a separate implementation gate.

## Format

`- [ ] T### [P?] [US#] Action with exact file path`

- `[P]` means tasks can proceed independently on different files.
- `[US#]` identifies the user story in `spec.md`.
- Every task names its relevant file or validation guide.

## Phase 1: Setup

**Purpose**: Prepare the documentation target location.

- [X] T001 Create or verify the `docs/development/` directory without changing existing application files, as the prerequisite for FR-005 through FR-007.

---

## Phase 2: Foundational

**Purpose**: Resolve shared blockers before story work.

No additional foundational work is required; repository evidence, rule ownership, and source-of-truth boundaries are recorded in `research.md`, `data-model.md`, and `contracts/documentation-sources.md`.

---

## Phase 3: User Story 1 - Find durable project rules (Priority: P1) - MVP

**Goal**: Keep the Constitution concise while preserving all durable requirements and required governance; make moved implementation guidance available in authoritative guides.

**Independent Test**: Compare the Constitution against `data-model.md`; confirm all technical MUST/SHOULD rules remain represented, Governance and metadata remain valid, and each guide reference resolves.

- [X] T002 [P] [US1] Document current Maven modules, domain cores, adapters, bootstrap responsibilities, and dependency boundaries in `docs/development/architecture.md` per FR-004 and FR-005; treat the module list as current state, not an exhaustive allow-list.
- [X] T003 [P] [US1] Move the existing Java style conventions into `docs/development/java.md` per FR-006, retaining SHOULD for records and the current preference level for constructor injection, final classes where appropriate, and explicit validation.
- [X] T004 [P] [US1] Move the existing frontend conventions into `docs/development/frontend.md` per FR-007, retaining strict TypeScript, feature/shared structure, central API client, React Query server-state management, and functional components/hooks at their existing normative strength.
- [X] T005 [US1] Reconcile `.specify/memory/constitution.md` with the completed guides per FR-001 through FR-004, FR-011, and FR-012; ensure references resolve, technical principles and security/quality requirements remain intact, README is the command source, Governance remains, metadata is valid, and Constitution version 2.0.0 is unchanged unless an actual further semantic change requires another bump.

**Checkpoint**: The Constitution and three guides form a complete, consistent set of project rules.

---

## Phase 4: User Story 2 - Apply implementation conventions (Priority: P2)

**Goal**: Make the detailed guides discoverable without disturbing existing agent guidance or duplicating the source documents.

**Independent Test**: Starting from `AGENTS.md`, locate each guide; confirm all existing issue-tracker, triage, and domain-documentation sections remain unchanged.

- [X] T006 [US2] Add concise links to the architecture, Java, and frontend guides in `AGENTS.md` per FR-009, preserving the existing Issue tracker, Triage labels, and Domain docs entries.
- [X] T007 [US2] Review the current canonical prerequisites and runnable checks in `README.md` per FR-008; update only a genuinely missing current prerequisite or command, and do not duplicate the command list elsewhere.

**Checkpoint**: A developer can find the current conventions from the repository agent instructions and README remains authoritative for runnable checks.

---

## Phase 5: User Story 3 - Run the documented quality checks (Priority: P3)

**Goal**: Validate the documentation sources, links, scope, and existing project quality gates.

**Independent Test**: Follow `quickstart.md`; verify every internal reference and record actual project-check results without touching unrelated in-progress work.

- [X] T008 [US3] Execute the deliverable, link, source-ownership, and scope checks in `specs/002-constitution-guides/quickstart.md` per FR-010, FR-012, SC-001 through SC-003, and SC-006; report missing paths or normative-rule drift.
- [X] T009 [US3] Run `mvn -s .mvn/settings.xml test` at the repository root and `npm ci && npm run typecheck` in `api-contract/typescript-contract/`, as required by `README.md` and `.github/workflows/ci.yml` and the plan's validation gate; record exact outcomes.
- [X] T010 [US3] From `frontend/`, run `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm test:e2e` per `README.md` and the plan's validation gate; record exact outcomes.
- [X] T011 [US3] Run `pnpm test:e2e:all` from `frontend/` after installing the documented browser projects, then execute the browser-matrix and container build/runtime smoke checks defined in `.github/workflows/ci.yml`; record any blocked gate explicitly rather than treating it as passed.

**Checkpoint**: Documentation acceptance checks and applicable established repository checks have real recorded results.

---

## Dependencies and Execution Order

- T001 precedes T002-T004.
- T002-T004 may run in parallel because they create separate guide files.
- T005 follows T002-T004 so the Constitution is reconciled against existing, resolvable guides.
- T006 and T007 follow the guides and Constitution; they touch separate files and may run in parallel.
- T008-T011 follow all documentation edits. They are validation tasks and must not modify unrelated files.
- User story order is P1 (Constitution and guides), then P2 (discoverability), then P3 (validation).

## Implementation Strategy

1. Complete setup and the P1 guide/Constitution work.
2. Confirm the relevant reviewer-owned checklist is approved before implementation continues; do not alter its markers on behalf of the reviewer.
3. Add the repository wayfinder and confirm README remains the only command inventory.
4. Run link/scope checks and then repository validations, preserving any unrelated working-tree changes.
5. Do not commit or push.
