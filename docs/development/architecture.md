# Backend Architecture

This document describes the repository's current module layout and the conventions
that preserve the domain boundary. Module names below describe the present structure;
they are not an exhaustive list of domains that may exist in the future.

## Current Maven modules

| Module | Current responsibility |
|---|---|
| [`poll-management`](../../poll-management/) | Framework-independent domain core for polls, lifecycle, options, votes, identities, and domain events. Inbound and outbound ports live under `core/ports/`. |
| [`template-catalog`](../../template-catalog/) | Framework-independent domain core for option templates and template groups, with its own inbound and outbound ports. |
| [`account-management`](../../account-management/) | Framework-independent domain core for local accounts, roles, credentials, and invitations, with its own inbound and outbound ports. |
| [`api-contract`](../../api-contract/) | Versioned OpenAPI source contract and build-time contract/code-generation inputs. The YAML contract is authoritative for HTTP behavior. |
| [`adapters`](../../adapters/) | Technical integration: inbound HTTP controllers, transaction adapters, scheduling, persistence, and adapters between domain ports. It depends on the domain modules and API contract. |
| [`bootstrap`](../../bootstrap/) | Spring Boot application assembly, configuration, security, database migration resources, and runtime packaging. It wires adapters and domain ports. |

The parent `pom.xml` aggregates these modules. The domain modules own business rules;
`adapters` implements technical connections; `bootstrap` assembles the running
application. The dependency direction keeps the domain cores independent of HTTP,
Spring, persistence, transaction management, and scheduling frameworks.

## Dependency and integration boundaries

- Use cases MUST be defined through inbound ports and external capabilities through
  outbound ports.
- HTTP, persistence, transaction, and scheduling implementations MUST remain in adapters
  or bootstrap configuration, not in domain models.
- Domain modules MUST enforce their own invariants and state transitions.
- Integrate one domain core with another through an explicit port/adapter boundary. The
  current poll-management configuration, for example, supplies a template snapshot
  provider backed by a template-catalog query port.
- Generated server and TypeScript API sources MUST NOT be manually edited or committed;
  change their versioned OpenAPI source and use the repository generators instead.
- Changes MUST NOT introduce an abstraction or dependency without a concrete need.
- `adapters` does not depend on Spring Security or Spring Mail. Controllers that write
  the Spring Security context (login, logout, password change, invitation acceptance)
  and the adapters for password hashing and SMTP live in `bootstrap`. Controllers in
  `adapters` read the signed-in account from the request attribute
  `AuthenticatedAccount`, which `bootstrap` sets after validating the session;
  security events are logged through `adapters`' `SecurityEventLogger`.

## Source references

- Module aggregation and dependencies: [`pom.xml`](../../pom.xml) and the linked module
  directories above.
- Core responsibilities: [`poll-management/package-info.java`](../../poll-management/src/main/java/de/justvotes/pollmanagement/package-info.java)
  and [`template-catalog/package-info.java`](../../template-catalog/src/main/java/de/justvotes/templatecatalog/package-info.java).
- Adapter responsibility: [`adapters/package-info.java`](../../adapters/src/main/java/de/justvotes/adapters/package-info.java).
- Composition example: [`PollManagementConfiguration.java`](../../bootstrap/src/main/java/de/justvotes/bootstrap/config/PollManagementConfiguration.java).
- Detailed domain vocabulary: [`CONTEXT.md`](../../CONTEXT.md).
- Architectural principles: [the Constitution](../../.specify/memory/constitution.md).
