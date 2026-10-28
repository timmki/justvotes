# Contract Delta: `api-contract/src/main/openapi/justvotes-v1.yaml`

Maßgeblich bleibt die YAML-Datei; dieses Dokument beschreibt die geplanten
Änderungen. `info.version` steigt von `1.0.0` auf `2.0.0` (inkompatibel:
anonymer Zugriff und Identitätswahl entfallen).

Alle Fehler bleiben RFC-9457 Problem Details mit `code`. Alle Antworten mit
Konto- oder Sitzungsdaten tragen `Cache-Control: no-store`. Unsafe-Methoden
verlangen weiterhin `X-XSRF-TOKEN` + `XSRF-TOKEN`-Cookie.

## Security Schemes

- `adminSession` → umbenannt in `session` (Cookie `JSESSIONID`), gilt für
  alle Konten.
- `voterIdentity` (Cookie `userID`) → entfernt.
- Globales `security: [ { session: [] } ]`; Ausnahmen explizit `security: []`.

## Status-Matrix

- `401`: keine oder abgelaufene Sitzung, ungültige Anmeldedaten
  (`authentication-required`, `invalid-credentials`)
- `403`: CSRF, fehlende Rolle (`access-denied`), Passwortwechsel erforderlich
  (`password-change-required`)
- `409`: zusätzlich `account-name-taken`, `identity-taken`,
  `email-already-invited`, `invitation-not-usable`,
  `invitation-delivery-unavailable`, `account-not-manageable`
- `422`: `password-policy-violation`, `current-password-invalid`
- `429` (neu): `login-throttled`, Header `Retry-After`

## Entfernte Operationen

| Methode/Pfad | Ersatz |
|---|---|
| `POST /admin/login` | `POST /session/login` |
| `POST /admin/logout` | `POST /session/logout` |
| `GET /admin/session` | `GET /session` |
| `GET /identity` | `GET /session` (`identity`) |
| `POST /identity` | entfällt ersatzlos |

## Neue und geänderte Operationen

### Session (Tag `Session`)

| Operation | Security | Request | Responses |
|---|---|---|---|
| `GET /csrf` | `[]` | – | unverändert |
| `POST /session/login` | `[]` + CSRF | `Login {username, password}` | `200 CurrentSession`, setzt `JSESSIONID` (rotiert), löscht `userID`; `401 invalid-credentials`; `429 login-throttled` |
| `GET /session` | session | – | `200 CurrentSession`; `401` |
| `POST /session/logout` | session + CSRF | – | `204`; `401` |
| `PUT /session/password` | session + CSRF | `PasswordChange {currentPassword, newPassword}` | `204` (andere Sitzungen ungültig); `422 current-password-invalid` / `password-policy-violation` |

`CurrentSession`:

```yaml
type: object
required: [accountName, role, passwordChangeRequired]
properties:
  accountName: { type: string }
  role: { type: string, enum: [user, admin] }
  identity: { type: string, nullable: true }   # null für admin
  passwordChangeRequired: { type: boolean }
```

### Invitations (Tag `Invitations`, ohne Anmeldung)

| Operation | Security | Request | Responses |
|---|---|---|---|
| `POST /invitations/inspection` | `[]` + CSRF | `InvitationTokenRequest {token}` | `200 InvitationPreview {email, expiresAt}`; `409 invitation-not-usable` |
| `POST /invitations/acceptance` | `[]` + CSRF | `InvitationAcceptance {token, username, userID, password}` | `200 CurrentSession` (angemeldet); `409 invitation-not-usable` / `account-name-taken` / `identity-taken`; `422 password-policy-violation`; `409 already-authenticated` bei bestehender Sitzung |

### Administration (Tag `Administration`, Rolle `admin`)

| Operation | Request | Responses |
|---|---|---|
| `GET /admin/invitations` | – | `200 InvitationSummary[]` |
| `POST /admin/invitations` | `InvitationRequest {email, locale?}` | `201 InvitationSummary`; `409 email-already-invited` / `invitation-delivery-unavailable` |
| `POST /admin/invitations/{invitationId}/resend` | – | `200 InvitationSummary`; `409 invitation-not-usable` |
| `DELETE /admin/invitations/{invitationId}` | – | `204` (widerrufen); `409 invitation-not-usable` |
| `GET /admin/accounts` | – | `200 AccountSummary[]` |
| `POST /admin/accounts/{accountId}/lock` | – | `200 AccountSummary`; `409 account-not-manageable` |
| `POST /admin/accounts/{accountId}/unlock` | – | `200 AccountSummary` |
| `POST /admin/accounts/{accountId}/one-time-password` | – | `200 OneTimePassword {password}` (nur einmal sichtbar); `409 account-not-manageable` für Admin |

```yaml
InvitationSummary:
  required: [invitationId, email, status, deliveryFailed, issuedAt, expiresAt]
  properties:
    invitationId: { type: string }      # opaque, Präfix i
    email: { type: string }
    status: { type: string, enum: [open, expired, accepted, revoked] }
    deliveryFailed: { type: boolean }
    issuedAt: { type: string, format: date-time }
    expiresAt: { type: string, format: date-time }
AccountSummary:
  required: [accountId, accountName, role, status, passwordChangeRequired, createdAt]
  properties:
    accountId: { type: string }         # opaque, Präfix a
    accountName: { type: string }
    role: { type: string, enum: [user, admin] }
    identity: { type: string, nullable: true }
    email: { type: string, nullable: true }
    status: { type: string, enum: [active, locked] }
    passwordChangeRequired: { type: boolean }
    createdAt: { type: string, format: date-time }
```

### Bestehende Operationen

- `/polls/**`: Security `session`, Rolle `user`; `401` ohne Sitzung, `403`
  für Administrator. Die Stimmabgabe nutzt die Kontoidentität; die Beschreibung
  „identity must be set“ entfällt.
- `/identity/votes`: Security `session`, Rolle `user`; `userID` ist stets die
  Kontoidentität (nie `null`).
- `/admin/**` (Polls, Katalog, Votes): Security `session`, Rolle `admin`;
  Verhalten unverändert.
- `info.description`: Abschnitte „Cookie contract“ und „Session and CSRF
  flow“ werden auf den neuen Ablauf umgeschrieben (kein `userID`-Cookie, ein
  Login für alle). Hinweis „audit entries are intentionally public“ wird zu
  „visible to all signed-in users“.
