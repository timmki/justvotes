# Research: Personal Profile

## Decision: Add a parameterless identity-scoped read operation

Expose `GET /api/v1/identity/votes`. The request has no identity parameter,
path value, or body. The server derives the identity from the existing
HttpOnly `userID` cookie. A missing or malformed cookie produces a successful
empty profile response with `userID: null` and `votes: []`.

**Rationale**: The existing `GET /identity` establishes the cookie-based
identity contract. A dedicated read operation can return exactly the personal
projection needed by the page without accepting an arbitrary identity lookup.

**Alternatives considered**: Extending `GET /identity` would change an
existing contract and overfetch for the application shell. A `/profile`
operation would duplicate identity semantics outside the existing identity
adapter.

## Decision: Query the existing poll aggregate through `ViewVotes`

Extend the existing `ViewVotes` input port with a current-votes query and add a
small immutable `PersonalVote` read model. Reuse `PollRepository` data, filter
with exact `Identity` equality and `Poll.isPubliclyReadable()`, and omit a
vote if its option reference cannot be resolved. Public active, expired, and
archived polls are eligible; private, draft, and deleted polls are excluded.

Expiry-on-read must run before mapping. If an active poll becomes due, the
operation publishes the existing lifecycle event and persists the expiry in
the existing transaction wrapper.

**Rationale**: Current votes already belong to the poll aggregate, while the
public audit is historical and the results view contains unrelated identities.
This is the smallest design that preserves domain invariants and privacy.

**Alternatives considered**: Client-side composition of `/polls` and
`/results` creates N+1 requests, exposes full result payloads, and cannot
discover archived public polls. A direct SQL projection or new index is
deferred until measured scale requires it.

## Decision: Keep the response minimal and non-cacheable

Return the current `userID` plus entries containing only poll ID, poll title,
poll lifecycle, selected option number/text, and vote timestamp. Use opaque
poll IDs, UTC timestamps, deterministic newest-vote-first ordering with poll
ID as the tie-breaker, and `Cache-Control: no-store`.

**Rationale**: These fields satisfy the profile use case without exposing vote
IDs, poll creators, private state, or other voters. Deterministic ordering
keeps the page and tests stable.

**Alternatives considered**: Reusing the full `Poll` or `PollResults` schemas
would expose unrelated fields and increase the privacy and compatibility
surface.

## Decision: Use existing frontend query and invalidation patterns

Add an `identityVotes` query key, a central `ApiClient` method, a profile page
under `features/profile`, and a small projection helper for display ordering.
Register `/profile` in the existing router and public navigation. Invalidate
the profile query after identity changes and public vote mutations; normal
React Query refetching handles a fresh page load.

**Rationale**: This follows the repository's React Query/server-state boundary,
reuses `IdentityEditor`, `PageFrame`, `QueryState`, and `RouteState`, and avoids
adding a new state-management mechanism.

**Alternatives considered**: A global profile store or a new data-fetching
abstraction would duplicate existing infrastructure without adding value.

## Decision: No schema, dependency, or security changes

Do not add Flyway migrations, persistence entities, Maven/npm dependencies, or
authentication rules. The endpoint is a public read, requires no CSRF token,
and still reads only the server-managed current identity cookie.

**Rationale**: The feature is a projection of existing persisted data and must
not weaken the existing session/CSRF model or introduce infrastructure work.
