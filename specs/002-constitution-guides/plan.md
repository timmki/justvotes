# Implementation Plan: Constitution and Development Guides

**Branch**: `002-constitution-guides` | **Date**: 2026-10-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-constitution-guides/spec.md`

## Summary

Simplify the project Constitution while preserving the template-required governance
and every technical MUST/SHOULD. Put current architecture, Java, and frontend
implementation conventions in focused normative guides; keep runnable commands in
README and make the guides discoverable from AGENTS.md. This is documentation-only:
no application behavior, API contract, generated code, or dependencies change.

## Technical Context

**Language/Version**: Markdown documentation; repository implementation context is Java 21 and strict TypeScript

**Primary Dependencies**: None added; existing Spring Boot, React, Vite, TypeScript, and React Query are documented only

**Storage**: Git-managed Markdown; no runtime or database changes

**Testing**: Documentation scope/source review, internal-link checks, and the established backend, frontend, contract-client, browser, and container CI validations

**Target Platform**: Repository documentation consumed by the solo developer and Spec Kit agents

**Project Type**: Documentation change in an existing multi-module Java backend and React frontend repository

**Performance Goals**: Not applicable; no runtime behavior changes

**Constraints**: Preserve all normative strength; retain Spec Kit-required Governance and metadata; no committee or separate approver; do not touch active `001-personal-profile` work; README remains the command source; no invented ADR history

**Scale/Scope**: One Constitution, three focused guides, the existing README and AGENTS.md, and Spec Kit artifacts for this documentation feature

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Core Principles**: Pass. The design preserves the hexagonal domain-core principle,
  contract-first API, domain invariants, typed frontend, and test gates. Current module
  names become factual architecture documentation rather than a closed constitutional
  allow-list.
- **Additional Constraints**: Pass. Flyway-only validated migrations, no Hibernate
  schema auto-update, server-side session/CSRF protections, accessibility, responsive
  layout, i18n, and `CONTEXT.md` terminology remain constitutional constraints.
- **Development Workflow**: Pass. The README remains canonical for runnable checks;
  all existing mandatory CI checks remain required. No generated artifacts are edited.
- **Governance**: Pass. Retain amendment rationale, semantic versioning, solo-developer
  compliance review, Constitution precedence, and version/date metadata. Keep the
  ratification date as its existing explicit TODO; do not fabricate a date.
- **Constitution version**: The Constitution phase has set version `2.0.0`, because the
  prior fixed domain-module MUST is generalized and implementation conventions move to
  binding guides. Last amended date is `2026-10-10`.
- **Pending link completion**: The newly referenced development guides are required
  deliverables in this feature. Final verification MUST confirm that all links resolve.
- **Scope**: No application code, tests, OpenAPI, generated API, dependencies, or runtime
  behavior are in scope.

No unjustified constitutional deviation is proposed.

## Project Structure

### Documentation (this feature)

```text
specs/002-constitution-guides/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/
│   └── documentation-sources.md
├── quickstart.md
├── checklists/
│   ├── requirements.md
│   └── documentation.md       # generated custom reviewer checklist
└── tasks.md
```

### Source Code (repository root)

```text
.specify/
├── feature.json               # points to this feature during its workflow
└── memory/constitution.md     # revised durable rules and governance
AGENTS.md                      # entry-point links to development guides
README.md                      # existing stack, prerequisites, and runnable checks
CONTEXT.md                     # existing domain glossary; remains unchanged
api-contract/src/main/openapi/justvotes-v1.yaml  # remains unchanged
adapters/
bootstrap/
docs/
├── agents/                    # existing agent guidance; preserve
└── development/               # new normative architecture, Java, and frontend guides
    ├── architecture.md
    ├── java.md
    └── frontend.md
poll-management/
template-catalog/
frontend/
```

**Structure Decision**: Add only the three missing guides under `docs/development/`,
update the existing entry points `AGENTS.md`, `README.md`, and Constitution, and keep
the feature artifacts under `specs/002-constitution-guides/`. The existing OpenAPI
contract and all application modules are explicitly out of scope. Do not create an ADR
or duplicate currently documented test commands.

## Phase 0: Research

Completed in `research.md`. Repository evidence confirmed the current five Maven modules,
core/adapter/bootstrap responsibilities, strict TypeScript, the React Query dependency,
existing README validation commands, and CI gates. No verified prior ADR or existing
development guides were found. No open question blocks the design.

## Phase 1: Design & Documentation Contracts

- `data-model.md` maps each existing Constitution rule to its retained or relocated
  canonical document. It models documentation ownership, not runtime entities.
- `contracts/documentation-sources.md` defines the canonical source-of-truth and link
  rules for the documentation deliverables; it is not an application API contract.
- `quickstart.md` defines the documentation/link validation and points to the README for
  the repository's established executable checks.
- No runtime API contract, schema, or application data model changes are required.

### Implementation sequence (for task generation)

1. Create the architecture, Java, and frontend guides from verified repository evidence,
   preserving MUST/SHOULD exactly and describing module names as the current layout.
2. Adjust the Constitution wording and references as needed to match the final guides;
   keep Governance and metadata. The Sync Impact Report is temporary and should be
   removed before a later commit; this request does not authorize a commit.
3. Keep or update README content only if verification exposes an actual missing current
   prerequisite or check; do not duplicate the command inventory.
4. Add concise guide pointers to AGENTS.md while preserving all current sections.
5. Validate every internal link and each source-to-destination mapping; run the documented
   repository validations after implementation and final convergence.

## Complexity Tracking

No additional dependency, application module, abstraction, API, schema, or ADR is needed.
