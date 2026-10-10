# Data Model: Personal Profile

## Identity

The existing `Identity` represents the exact global `userID` assigned to the
current request.

- **Value**: 1 to 64 Unicode code points; case, whitespace, punctuation, and
  Unicode are preserved for equality.
- **Source**: Existing server-managed `userID` cookie.
- **Privacy**: The query never accepts an identity supplied by the caller.
- **Missing or malformed value**: Represented at the HTTP boundary as
  `userID: null` with no vote entries; the frontend presents the
  identity-empty state.

## PersonalVote

New immutable domain read model representing one current vote belonging to the
current identity in one publicly readable poll.

| Field | Type | Rules |
| --- | --- | --- |
| `pollId` | `Poll.PollId` | Existing opaque poll identity; required |
| `pollTitle` | `String` | Existing poll title; required |
| `pollState` | `Poll.State` | Must be `ACTIVE`, `EXPIRED`, or `ARCHIVED` |
| `optionNumber` | `int` | Must identify an existing poll option |
| `optionText` | `String` | Text of the identified current option |
| `votedAt` | `Instant` | Existing current-vote timestamp; required |

## CurrentIdentityVotes

HTTP response projection containing the current identity and its personal
entries.

- `userID`: exact identity string or `null` when no valid current identity is
  available.
- `votes`: zero or more `PersonalVote` entries.
- Entries are ordered by `votedAt` descending, then opaque poll ID ascending.
- Only polls where `Poll.isPubliclyReadable()` is true are included.
- Private, draft, deleted, and otherwise unresolved entries are omitted.
- The response is never stored by browsers or intermediary caches.

## Relationships and State Rules

- One `Identity` has zero or one current `Vote` per `Poll`.
- One `PersonalVote` references exactly one existing `Poll` and one existing
  option in that poll.
- Replacing a `Vote` replaces the corresponding personal entry and timestamp.
- Withdrawing a `Vote` removes the corresponding personal entry.
- Changing identity causes the next read to use only the new identity; votes
  removed from active polls are not returned for the new identity.
- An active poll due for expiry transitions to `EXPIRED` before the entry is
  mapped; expired and archived public polls remain readable.
