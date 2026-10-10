# Frontend Development Conventions

These conventions apply to the React/Vite frontend in `frontend/`. The Constitution's
security, accessibility, localization, responsive-layout, and quality requirements remain
authoritative.

## TypeScript and structure

- TypeScript MUST remain in strict mode.
- Domain-facing UI MUST be organized by feature under
  [`frontend/src/features/`](../../frontend/src/features/).
- Reusable UI and shared infrastructure MUST be under
  [`frontend/src/shared/`](../../frontend/src/shared/).
- New UI MUST use functional React components, hooks, and small explicit functions.

## API and state

- API access MUST use the central client under
  [`frontend/src/shared/api/`](../../frontend/src/shared/api/).
- React Query MUST manage server state, caching, and invalidation.
- Local UI state MUST remain separate from server state, projections, and formatting.
- Generated API client sources MUST NOT be manually edited or committed. Update the
  [versioned OpenAPI source](../../api-contract/src/main/openapi/justvotes-v1.yaml) and use
  the documented generation command.

## User interface quality

- UI MUST use semantic HTML, accessible forms, visible focus states, keyboard operation, and
  suitable ARIA/live-region behavior.
- Layouts MUST remain usable at small and large viewport sizes.
- Visible text and errors MUST use the existing internationalization resources.
- Domain terminology MUST come from [`CONTEXT.md`](../../CONTEXT.md); developers MUST NOT
  reintroduce terms listed there as avoided synonyms.

## Project sources and checks

- Durable frontend and application quality requirements:
  [the Constitution](../../.specify/memory/constitution.md).
- Backend module boundaries: [Backend Architecture](architecture.md).
- Exact prerequisites, frontend scripts, and validation commands: the
  [README](../../README.md).
- Frontend scripts and TypeScript configuration: [`package.json`](../../frontend/package.json)
  and [`tsconfig.json`](../../frontend/tsconfig.json).
