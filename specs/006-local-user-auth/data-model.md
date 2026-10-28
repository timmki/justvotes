# Data Model: Lokale Konten mit Anmeldung und Berechtigungen

Domänenmodul: `account-management` (`de.justvotes.accountmanagement.core`).
Persistenz über Flyway `V7__local_accounts.sql`.

## Value Objects

| Typ | Regeln |
|---|---|
| `AccountId` | Opaque, serverseitig vergeben (Long intern, nach außen über `OpaqueIdCodec` mit Präfix `a`). |
| `AccountName` | 3–32 Codepoints, `[A-Za-z0-9._-]`, nicht nur Ziffern; `normalized()` = Kleinschreibung (`Locale.ROOT`) für Eindeutigkeit. |
| `EmailAddress` | 3–254 Zeichen, genau ein `@`, nicht leer davor/danach; `normalized()` = Kleinschreibung. |
| `Identity` (account-seitig `AccountIdentity`) | Gleiche Regeln wie `poll-management` `Identity` (1–64 Codepoints); zusätzlich keine führenden/abschließenden Leerzeichen; `normalized()` = Kleinschreibung für Eindeutigkeit. Gespeichert wird der eingegebene Wert. |
| `Password` | 12–128 Codepoints, nicht nur Leerraum; existiert nur transient, wird nie gespeichert (siehe research R3). |
| `PasswordHash` | Opaque String mit Encoder-Präfix; Erzeugung/Prüfung über Out-Port `PasswordHasher`. |
| `InvitationToken` | 32 Byte zufällig, Base64url; nur transient. `InvitationTokenHash` = SHA-256 hex, persistiert. |
| `Role` | `USER`, `ADMIN`. |
| `AccountStatus` | `ACTIVE`, `LOCKED`. |

## Aggregat `Account`

| Feld | Typ | Bemerkung |
|---|---|---|
| id | `AccountId` | |
| name | `AccountName` | eindeutig (normalisiert) |
| role | `Role` | `ADMIN` genau einmal, nur über Bootstrap |
| identity | `AccountIdentity?` | Pflicht bei `USER`, leer bei `ADMIN`; unveränderlich |
| email | `EmailAddress?` | Pflicht bei `USER`, leer bei `ADMIN`; eindeutig (normalisiert) |
| status | `AccountStatus` | |
| passwordHash | `PasswordHash` | |
| passwordChangeRequired | boolean | true nach Einmalpasswort |
| sessionEpoch | int | erhöht bei Passwortänderung, Einmalpasswort, Sperrung |
| createdAt / updatedAt | Instant | UTC |

**Invarianten**

- `role = USER` ⇔ `identity` und `email` gesetzt.
- `role = ADMIN` ⇒ `status = ACTIVE` immer (FR-030).
- Identität, Name, Rolle sind nach Anlage unveränderlich.

**Operationen und Übergänge**

| Operation | Vorbedingung | Wirkung |
|---|---|---|
| `Account.createUser(name, identity, email, hash, now)` | über angenommene Einladung | `ACTIVE`, `USER`, epoch 0 |
| `Account.createAdmin(name, hash, now)` | kein Admin vorhanden | `ACTIVE`, `ADMIN` |
| `verifyLogin(password, hasher)` | `ACTIVE` | Erfolg/Fehlschlag; `LOCKED` ⇒ Fehlschlag mit gleicher Meldung |
| `changePassword(current, new, hasher)` | `ACTIVE`, current korrekt, new ≠ current | neuer Hash, `passwordChangeRequired=false`, epoch+1 |
| `assignOneTimePassword(hash)` | `USER` | neuer Hash, `passwordChangeRequired=true`, epoch+1 |
| `lock()` | `USER`, `ACTIVE` | `LOCKED`, epoch+1 |
| `unlock()` | `USER`, `LOCKED` | `ACTIVE` |
| `resetAdminPassword(hash)` | `ADMIN`, nur Bootstrap mit `ADMIN_PASSWORD_RESET` | neuer Hash, epoch+1 |

```text
           lock()               
 ACTIVE ───────────▶ LOCKED     (nur USER)
   ▲                    │
   └──── unlock() ──────┘
```

## Aggregat `Invitation`

| Feld | Typ | Bemerkung |
|---|---|---|
| id | `InvitationId` | opaque nach außen, Präfix `i` |
| email | `EmailAddress` | normalisiert eindeutig unter offenen Einladungen und Konten |
| tokenHash | `InvitationTokenHash` | ändert sich bei erneutem Versand |
| status | `InvitationStatus` | `OPEN`, `ACCEPTED`, `REVOKED` (abgelaufen wird berechnet) |
| expiresAt | Instant | `issuedAt + 7 Tage` |
| deliveryFailed | boolean | gesetzt bei Versandfehler, zurückgesetzt bei erfolgreichem Versand |
| issuedAt / acceptedAt | Instant | |
| acceptedAccountId | `AccountId?` | |

**Effektiver Status** (für Anzeige): `ACCEPTED`, `REVOKED`, sonst `EXPIRED`
wenn `now ≥ expiresAt`, sonst `OPEN`; `deliveryFailed` zusätzlich als Flag.

| Operation | Vorbedingung | Wirkung |
|---|---|---|
| `Invitation.issue(email, tokenHash, now)` | keine offene Einladung und kein Konto für E-Mail | `OPEN`, expiresAt = now+7d |
| `reissue(tokenHash, now)` | `OPEN` oder abgelaufen | neues Token, neue Frist, `deliveryFailed=false` |
| `revoke()` | `OPEN` (auch abgelaufen) | `REVOKED` |
| `accept(tokenHash, now)` | `OPEN`, nicht abgelaufen, Hash passt | `ACCEPTED`, acceptedAt; Konto wird im selben Anwendungsfall angelegt |
| `markDeliveryFailed()` / `markDelivered()` | `OPEN` | Flag setzen/löschen |

Ein Fehler bei der Kontoanlage (Name/Identität vergeben) lässt die Einladung
`OPEN` (Spec US2 Szenario 5) – die Transaktion wird vollständig zurückgerollt.

## Ports

**In-Ports**

- `Authenticate` – `authenticate(name, password) → AuthenticatedAccount`
  (inkl. Drosselungsprüfung über Adapter, research R5)
- `ManageOwnCredentials` – `changePassword(accountId, current, new)`
- `AcceptInvitation` – `inspect(token) → InvitationView`,
  `accept(token, name, identity, password) → AccountId`
- `ManageInvitations` – `invite(email)`, `resend(id)`, `revoke(id)`,
  `list() → List<InvitationSummary>`
- `ManageAccounts` – `lock(id)`, `unlock(id)`,
  `assignOneTimePassword(id) → OneTimePassword` (einmalig zurückgegeben)
- `ViewAccounts` – `list() → List<AccountSummary>`, `find(id)`
  (`sessionEpoch`, Status für Sitzungsprüfung)

**Out-Ports**

- `AccountRepository`, `InvitationRepository`
- `PasswordHasher` (`hash`, `matches`, `needsUpgrade`)
- `InvitationMailer` (`isAvailable()`, `send(email, link, expiresAt, locale)`);
  `isAvailable()` ist `false`, wenn Mailserver oder öffentliche Adresse nicht
  konfiguriert sind – `ManageInvitations.invite` lehnt dann mit
  `invitation-delivery-unavailable` ab (research R7)
- `TokenGenerator` (Einladungstoken, Einmalpasswort – 16 Zeichen aus
  eindeutigem Alphabet ohne `0O1lI`)
- `UtcClock`

## Persistenz (`V7__local_accounts.sql`)

```text
Account(id INTEGER PK AUTOINCREMENT,
        name TEXT NOT NULL, nameKey TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL CHECK (role IN ('USER','ADMIN')),
        identity TEXT NULL, identityKey TEXT NULL UNIQUE,
        email TEXT NULL, emailKey TEXT NULL UNIQUE,
        status TEXT NOT NULL CHECK (status IN ('ACTIVE','LOCKED')),
        passwordHash TEXT NOT NULL,
        passwordChangeRequired INTEGER NOT NULL DEFAULT 0,
        sessionEpoch INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
        CHECK ((role='USER' AND identity IS NOT NULL AND email IS NOT NULL)
            OR (role='ADMIN' AND identity IS NULL AND email IS NULL)))
  + partieller UNIQUE-Index auf role WHERE role='ADMIN'

Invitation(id INTEGER PK AUTOINCREMENT,
           email TEXT NOT NULL, emailKey TEXT NOT NULL,
           tokenHash TEXT NOT NULL UNIQUE,
           status TEXT NOT NULL CHECK (status IN ('OPEN','ACCEPTED','REVOKED')),
           deliveryFailed INTEGER NOT NULL DEFAULT 0,
           issuedAt TEXT NOT NULL, expiresAt TEXT NOT NULL,
           acceptedAt TEXT NULL,
           acceptedAccountId INTEGER NULL REFERENCES Account(id))
  + partieller UNIQUE-Index auf emailKey WHERE status='OPEN'

DELETE FROM Vote;
DELETE FROM PollDomainEvent WHERE eventType IN ('VoteCast','VoteReplaced',
  'VoteWithdrawn','VoteRemovedByAdmin','VoteRemovedForIdentityChange');
DROP TABLE Admin;
```

Spaltennamen folgen der bestehenden Konvention mit gequoteten camelCase-Namen.

## Beziehung zu `poll-management`

- `Vote.userID` speichert weiterhin den Identitätswert als Text; es gibt keinen
  Fremdschlüssel auf `Account` (Domänen bleiben getrennt).
- Der HTTP-Adapter erzeugt `pollmanagement.core.model.Identity` aus
  `Account.identity` des angemeldeten Principals.
- `Poll.createdBy` und `PollDomainEvent.actorId` für Administrationsaktionen
  bleiben der Kontoname des Administrators.
