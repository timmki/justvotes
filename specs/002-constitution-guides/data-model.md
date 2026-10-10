# Documentation Ownership Model

This feature changes no application entities or persisted data. The model below records
which repository document owns each existing rule so that moving guidance does not
silently weaken or duplicate it.

| Existing rule or information | Canonical destination | Normative treatment |
|---|---|---|
| Framework-independent domain cores, ports, adapters, bootstrap responsibility, and domain invariants | `.specify/memory/constitution.md` | Durable constitutional MUST principles |
| Current Maven module responsibilities and dependency direction | `docs/development/architecture.md` | Factual current layout and binding boundary conventions; not an exhaustive module allow-list |
| Versioned OpenAPI as HTTP source of truth, generated-source policy, compatibility | `.specify/memory/constitution.md` and the existing OpenAPI file | Constitution principles remain binding; OpenAPI file owns endpoint details |
| Explicit typed domain rules and encapsulated mutable aggregates/entities | `.specify/memory/constitution.md` | Durable constitutional MUST principles |
| Records for value objects, constructor injection, final classes where appropriate, explicit validation | `docs/development/java.md` | Preserve SHOULD for records and existing preference strength for style conventions |
| Strict TypeScript, feature/shared layout, central API client, React Query, functional components/hooks | `docs/development/frontend.md` | Preserve the existing MUST/declarative binding force; do not weaken conventions |
| Flyway migration policy, no Hibernate schema auto-update, server session and CSRF security | `.specify/memory/constitution.md` | Security/data-integrity MUST constraints |
| Accessibility, responsive layout, i18n, and domain vocabulary | `.specify/memory/constitution.md`; `CONTEXT.md` owns glossary definitions | Constitution requirements remain binding; glossary remains canonical for terms |
| Build prerequisites and executable backend, frontend, client, browser, and container checks | `README.md` and `.github/workflows/ci.yml` | README gives commands; CI defines mandatory automated gates |
| Repository wayfinding to development guides | `AGENTS.md` | Index only; must preserve existing agent guidance |
| Constitution amendment, semantic version policy, compliance expectations and version/date fields | `.specify/memory/constitution.md` | Required minimal governance, tailored to one developer |

## Relationships

- The Constitution governs the durable rules and refers to focused guides for concrete
  implementation conventions.
- Development guides refine, but MUST NOT contradict, the Constitution.
- `CONTEXT.md` defines domain terms; the Constitution and guides use that vocabulary.
- The OpenAPI contract defines HTTP details; this documentation feature does not modify it.
- README and CI own executable check instructions and automated workflow definitions.
- AGENTS.md links to the sources above; it does not copy their full contents.

## Change boundaries

No database schema, runtime model, API, application test, or generated source is introduced
or changed by this feature.
