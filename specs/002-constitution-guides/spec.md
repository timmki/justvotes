# Feature Specification: Constitution and Development Guides

**Feature Branch**: `002-constitution-guides`

**Created**: 2026-10-10

**Status**: Draft

**Input**: User description: "Read docs/plans/constitution-simplification.md and execute the documented work. Keep the Governance section and metadata required by the Spec Kit constitution skill."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Find durable project rules (Priority: P1)

The solo developer needs a concise Constitution that states durable architectural,
security, quality, and governance rules, with operational details in focused,
findable project documentation.

**Why this priority**: The Constitution is read by later Spec Kit phases. It must
remain accurate and actionable without duplicating implementation instructions.

**Independent Test**: Review the resulting Constitution and follow every internal
documentation reference. Confirm each project-wide MUST has a clear home and the
referenced sources exist.

**Acceptance Scenarios**:

1. **Given** the Constitution has been simplified, **When** the developer reads
   its principles, **Then** domain boundaries, API compatibility, test quality,
   security, accessibility, localization, and required governance remain explicit.
2. **Given** detailed language, module, or frontend conventions were moved,
   **When** the developer follows the Constitution's references, **Then** the
   binding convention and its evidence are available in the relevant guide.
3. **Given** the Constitution describes its sources of truth, **When** the
   developer checks a domain term, HTTP contract, or test command, **Then** the
   relevant single canonical source is identifiable.

### User Story 2 - Apply implementation conventions (Priority: P2)

The solo developer needs focused architecture, Java, and frontend guides that
capture the current conventions and remain discoverable from the repository's
agent guidance.

**Why this priority**: The detailed conventions should remain available and
binding after being removed from the concise Constitution.

**Independent Test**: Use AGENTS.md to locate each applicable guide; compare the
guides against the current repository structure and existing project conventions.

**Acceptance Scenarios**:

1. **Given** backend architecture work, **When** the developer follows the
   architecture guide, **Then** the current module responsibilities and
   dependency boundaries are described without forbidding future modules.
2. **Given** Java or frontend work, **When** the developer follows the relevant
   guide, **Then** the existing coding preferences and required conventions
   retain their prior MUST/SHOULD strength.
3. **Given** the repository agent guidance, **When** the developer seeks
   development conventions, **Then** it points to the relevant guides without
   disturbing the existing issue-tracker, triage, or domain-documentation rules.

### User Story 3 - Run the documented quality checks (Priority: P3)

The solo developer needs one canonical place for prerequisites and runnable
build and test commands, and a Constitution that refers to it rather than
maintaining a duplicate command list.

**Why this priority**: A single maintained set of commands reduces drift while
preserving the quality gates.

**Independent Test**: Compare the Constitution and README, then run the
applicable documented checks and record actual results.

**Acceptance Scenarios**:

1. **Given** the developer needs to validate backend or frontend changes,
   **When** the developer consults the documentation, **Then** the README
   contains the runnable commands and the Constitution references it.
2. **Given** documentation commands are moved or referenced, **When** the final
   changes are checked, **Then** no mandatory validation category has been
   silently removed or weakened.

### Edge Cases

- The original Constitution ratification date is unknown; it must not be
  fabricated.
- An architecture, Java, or frontend guide may already exist; update a suitable
  existing source rather than creating a duplicate.
- A moved convention must not change from MUST to SHOULD or from SHOULD to MUST.
- A referenced guide must not be left missing or unlinked at completion.
- The active `001-personal-profile` feature contains unrelated in-progress work;
  its artifacts and implementation changes must remain untouched.
- Generated API sources and application behavior are outside this documentation
  change.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Constitution MUST retain the Spec Kit template structure,
  including Core Principles, additional constraints, Development Workflow,
  Governance, and Version/Ratified/Last Amended metadata.
- **FR-002**: Governance MUST state the amendment procedure, semantic versioning
  policy, and compliance-review expectation in a form suitable for a project
  maintained by one developer; it MUST NOT add a committee or separate approver.
- **FR-003**: The Constitution MUST preserve its domain, contract-first,
  compatibility, explicit-domain-model, frontend-quality, testing, security,
  accessibility, localization, and canonical-source requirements.
- **FR-004**: The Constitution MUST state general architecture and quality
  principles rather than treating the current domain module names as an
  exhaustive module allow-list.
- **FR-005**: Concrete current module responsibilities MUST be documented in a
  discoverable architecture guide, without asserting that the present module
  list is exhaustive.
- **FR-006**: Java implementation conventions MUST be documented in one
  discoverable Java guide, preserving the current distinction between required
  rules and preferences.
- **FR-007**: Frontend directory, TypeScript, API-client, React Query, and
  component conventions MUST be documented in one discoverable frontend guide,
  preserving their current binding strength.
- **FR-008**: README MUST remain the canonical source for current technology
  prerequisites and runnable build and test commands; the Constitution MUST
  refer to it instead of duplicating the command list.
- **FR-009**: AGENTS.md MUST provide a concise wayfinder to applicable development
  guides while preserving its existing issue-tracker, triage-label, and domain
  documentation guidance.
- **FR-010**: Documentation changes MUST preserve all moved technical
  requirements without introducing application-code, API, generated-source, or
  behavior changes.
- **FR-011**: The Constitution MUST retain its original unknown ratification
  date as an explicit TODO rather than inventing a date, and MUST update its
  version and last-amended date according to the applicable Constitution rules.
- **FR-012**: All newly added internal documentation links MUST resolve at
  completion, and each relocated convention MUST have one canonical home.

### Key Entities

- **Constitution**: The project's durable principles, constraints, development
  workflow expectations, governance, and version metadata.
- **Development guide**: A focused document describing binding or preferred
  implementation conventions for architecture, Java, or frontend work.
- **Canonical source**: The authoritative project document for a given domain,
  HTTP contract, or executable validation instruction.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of current Constitution requirements are accounted for as
  retained constitutional rules, relocated binding rules, or explicitly removed
  operational duplication; none are silently lost.
- **SC-002**: 100% of internal links added or changed by this work resolve to an
  existing file or documented repository source at completion.
- **SC-003**: Each relocated architecture, Java, or frontend convention has
  exactly one canonical guide, and AGENTS.md makes the guides discoverable.
- **SC-004**: The README remains the only canonical source for runnable
  development and test commands; no duplicate command inventory remains in the
  Constitution.
- **SC-005**: The Constitution retains Governance, semantic versioning, and all
  three required date/version fields; the unknown ratification date is not
  represented as a fabricated calendar date.
- **SC-006**: No application behavior, API schema, generated source, or
  application test is changed as part of this documentation work.

## Assumptions

- The approved scope is the current `docs/plans/constitution-simplification.md`,
  with the user's subsequent instruction to retain the Governance section and
  metadata required by the Spec Kit skill.
- The only developer performs the required compliance review; no independent
  reviewer, committee, or additional approval process is introduced.
- Existing README instructions are the canonical test and build guide; update
  them only if repository inspection demonstrates an actual missing prerequisite
  or command required by a relocated rule.
- The MAJOR Constitution version change is justified by generalizing a
  previously fixed constitutional domain-module boundary and relocating
  implementation-specific binding rules to focused guides.
- Application implementation is not part of this task. Existing unrelated
  in-progress changes are user-owned and must be preserved.
