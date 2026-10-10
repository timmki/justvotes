# Java Development Conventions

These conventions apply to Java changes in the repository. The Constitution's domain
boundary and invariant rules remain authoritative; this guide records the concrete Java
style used to support them.

## Runtime context

- The application currently targets Java 21 and uses Spring Boot for runtime assembly.
- Spring, persistence, transaction, HTTP, and scheduling details belong in adapter or
  bootstrap code. Keep the domain core framework-independent.

## Domain models and style

- Records SHOULD be used for value objects and immutable data.
- Domain aggregates and entities MUST encapsulate mutable state and enforce their own
  invariants and allowed state transitions.
- Constructor injection is the preferred dependency-injection style.
- `final` classes where appropriate are preferred project style.
- Explicit validation is preferred over implicit validation through controller or
  persistence behavior. Validate domain constraints at the domain boundary.
- Keep classes and functions small and explicit; avoid introducing abstractions or
  dependencies without a demonstrated need.

## Tests and generated sources

- Domain rules MUST be covered with unit tests and integration boundaries with integration
  tests. Tests MUST assert public behavior and MUST NOT lock unnecessary implementation
  details.
- Generated Java API sources MUST NOT be manually edited or committed. Change the versioned OpenAPI
  source and regenerate the outputs using the documented build.
- Use the repository's established Maven settings and test commands from the
  [`README.md`](../../README.md).

## Project sources

- Domain terms: [`CONTEXT.md`](../../CONTEXT.md).
- Module responsibilities and dependency boundaries:
  [Backend Architecture](architecture.md).
- Durable rules, API compatibility, security, and quality gates:
  [the Constitution](../../.specify/memory/constitution.md).
- Build prerequisites and exact commands: the [README](../../README.md).
