# Documentation Source Contract

This contract defines the source-of-truth and navigation behavior for this documentation
change. It does not define or change an application HTTP/API contract.

## Canonical sources

| Subject | Canonical source | Link/index behavior |
|---|---|---|
| Durable architecture, compatibility, safety, quality, governance | `.specify/memory/constitution.md` | Constitution links to detailed architecture, Java, and frontend guidance |
| Current module responsibilities and dependency boundaries | `docs/development/architecture.md` | AGENTS.md indexes the guide; module names describe current state, not an exhaustive allow-list |
| Java coding conventions | `docs/development/java.md` | AGENTS.md indexes the guide; MUST/SHOULD force matches the pre-change Constitution |
| Frontend implementation conventions | `docs/development/frontend.md` | AGENTS.md indexes the guide; MUST/SHOULD force matches the pre-change Constitution |
| Domain terms | `CONTEXT.md` | Existing Constitution terminology rule remains authoritative |
| HTTP contract | `api-contract/src/main/openapi/justvotes-v1.yaml` | Unchanged by this feature |
| Build prerequisites and runnable validation commands | `README.md` | Constitution refers to README and does not duplicate the command inventory |
| CI gates | `.github/workflows/ci.yml` | Existing jobs and coverage remain unchanged |
| Navigation entry point | `AGENTS.md` | Contains concise links; preserves issue-tracker, triage-label, and domain-doc entries |

## Invariants

1. Every moved convention has one canonical guide.
2. Moving a convention MUST NOT change its original MUST/SHOULD force.
3. The Constitution remains authoritative over a conflicting development guide.
4. All added or changed repository-relative Markdown links resolve to their intended files.
5. The documentation update does not change application behavior, API schemas, generated
   API sources, dependency manifests, or application tests.
6. Existing README commands and CI check categories are retained; README remains the place
   to maintain runnable command syntax.
