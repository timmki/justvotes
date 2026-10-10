# Research: Constitution and Development Guides

## Decision: Keep the standard Spec Kit Constitution scaffold and minimize solo-project governance

**Rationale**: The active Spec Kit constitution skill requires Core Principles, additional
constraints, Development Workflow, Governance, semantic versioning, compliance expectations,
and version/date metadata. The user confirmed these elements should remain. Tailor governance to
the sole developer; do not add committees, separate approvers, or team-only processes.

**Evidence**: Active-profile `speckit-constitution` skill; resolved
`.specify/templates/constitution-template.md`; user instruction to retain skill-required governance.

**Alternatives considered**: Remove Governance and metadata (rejected by the user's later
instruction); add independent review bureaucracy (not appropriate for this single-developer
project).

## Decision: Generalize the constitutional architecture rule and document the current module map

**Rationale**: The root `pom.xml` currently declares `poll-management`, `template-catalog`,
`api-contract`, `adapters`, and `bootstrap`. The two core modules are domain-focused. Their
`package-info.java` files describe them as cores, while `adapters/package-info.java` identifies
technical infrastructure and external I/O. Adapter module dependencies include both domain
modules and the API contract; bootstrap depends on adapters and its configuration assembles
application beans. The current module names are real implementation facts, not a verified
exhaustive list of permissible future domains.

**Evidence**: `pom.xml`; `poll-management/pom.xml`; `template-catalog/pom.xml`;
`adapters/pom.xml`; `bootstrap/pom.xml`; the three modules' `package-info.java`; and
`bootstrap/src/main/java/de/justvotes/bootstrap/config/PollManagementConfiguration.java`.

**Alternatives considered**: Keep the exact two-module list as a constitutional allow-list
(rejected because it would unnecessarily prohibit future domain modules); create a retrospective
ADR (rejected because no existing ADR directory or verifiable decision record was found).

## Decision: Move implementation conventions into focused, normative development guides

**Rationale**: No `docs/development/` guide directory exists. `AGENTS.md` is the repository's
agent entry point, and `.specify/memory/constitution.md` currently mixes stable principles with
concrete module names, Java style, React implementation conventions, and command lists. Create
architecture, Java, and frontend guides and link them from `AGENTS.md`. Preserve each current
rule's MUST/SHOULD strength, and make the Constitution explicitly refer to the guides as binding
project conventions.

**Evidence**: `AGENTS.md`; `docs/agents/domain.md`; Constitution principles I, III, and IV;
repository search found no existing development guides.

**Alternatives considered**: Keep all details in the Constitution (rejected because the
Constitution is intended to state durable principles and the details duplicate operational
instructions); put the current architecture into ADRs (rejected because no prior ADR records
were found and this work must not invent decision history).

## Decision: README remains the source of executable commands

**Rationale**: The README already documents Java 21, Maven settings, backend tests, frontend
prerequisites and checks, generated-client validation, release builds, and container smoke
checks. CI separately defines frontend, backend/contract, multi-browser, and container jobs.
The Constitution should require the gates and point to README/CI rather than duplicate command
inventories. Do not reduce the scope of existing CI checks.

**Evidence**: `README.md`; `.github/workflows/ci.yml`; `pom.xml`; `frontend/package.json`.

**Alternatives considered**: Copy the command list into another development guide (rejected due
to duplication); add commands to README that are already present (rejected absent evidence of a
missing command).

## Decision: Treat this as documentation-only work with no runtime API contract changes

**Rationale**: The existing OpenAPI contract is authoritative for the application, but this
feature changes only project documentation and Spec Kit artifacts. Do not modify OpenAPI,
generated sources, application source, application tests, or runtime behavior. No new runtime
API contract artifact is needed. The feature's documentation deliverable mapping belongs in
`data-model.md` and its link constraints in the design artifacts.

**Evidence**: Feature specification FR-010; current OpenAPI path in README; plan scope.

**Alternatives considered**: Add a new API contract file (rejected because no API surface
changes); create a source-code test to check prose links (rejected unless existing tooling already
supports it; manual and scripted link/path checks are sufficient for this documentation-only
scope).

## Decision: Use Constitution version 2.0.0 and preserve the unknown ratification TODO

**Rationale**: The current Constitution is version 1.0.0. Generalizing its fixed domain-module
boundary changes a binding rule; moving language-specific technical requirements to referenced
binding guides also changes the document's normative structure. Under its own policy this is a
MAJOR change. The original ratification date has no reliable evidence, so keep the existing TODO.
The current environment date is 2026-10-10; use this as Last Amended.

**Alternatives considered**: PATCH or MINOR bump (rejected because the domain boundary is a
materially redefined MUST); infer ratification from a commit date (rejected because that would
fabricate approval history).

## Open questions

None remain that block design. There are no verified prior ADRs to carry forward, and no runtime
contract changes are in scope.
