# API Contract: Current Identity Votes

The canonical contract is added to
`api-contract/src/main/openapi/justvotes-v1.yaml`; this document records the
feature-specific design.

## `GET /api/v1/identity/votes`

- **Operation**: `currentIdentityVotes`
- **Tag**: `Identity`
- **Authentication**: None; the current identity comes only from the existing
  HttpOnly `userID` cookie.
- **Request**: No query parameters, path parameters, or request body.
- **CSRF**: Not required because this is a safe GET.
- **Caching**: Response MUST include `Cache-Control: no-store`.

### `200 OK`

```json
{
  "userID": "alice",
  "votes": [
    {
      "poll": {
        "id": "p_v1_example",
        "title": "Preferred transport",
        "state": "active"
      },
      "option": {
        "number": 2,
        "text": "Train"
      },
      "votedAt": "2026-09-15T12:00:00.000Z"
    }
  ]
}
```

The response schema contains required `userID` and `votes` properties.
`userID` is nullable. Each vote contains required `poll`, `option`, and
`votedAt` properties. Poll contains opaque `id`, `title`, and `state`; the
profile response state is restricted to `active`, `expired`, and `archived`.
These are the lowercase JSON values of the corresponding uppercase domain
states. Option uses the existing option number/text shape; timestamps use the
existing UTC RFC3339 format.

When the cookie is absent or malformed, return `200` with:

```json
{
  "userID": null,
  "votes": []
}
```

The server returns only current votes in public `active`, `expired`, or
`archived` polls. It exposes no vote ID, creator, private poll, other identity,
or full voter list. Entries are ordered newest vote first, with poll ID as a
stable tie-breaker.
