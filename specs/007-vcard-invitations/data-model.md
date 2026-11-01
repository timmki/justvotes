# Data Model: Einladungen aus einer vCard-Datei

Ergänzt das Datenmodell aus [`006-local-user-auth/data-model.md`](../006-local-user-auth/data-model.md).

## Wertobjekte (account-management)

| Typ | Regeln |
|---|---|
| `SuggestedIdentity` | Gleiche Regeln wie `AccountIdentity` (1–64 Codepoints, ohne Leerraum am Rand). Fabrik `fromContactName(String)` strippt, kürzt auf 64 Codepoints und liefert leer, wenn nichts übrig bleibt. |
| `ContactCandidate` | Ein gelesener Kontakt: `name` (optional, nur Anzeige/Vorschlag), `email` (optional, Rohwert der bevorzugten Adresse), `position` (1-basiert, Reihenfolge in der Datei). |
| `ContactOutcome` | `INVITE`, `RENEW`, `HAS_ACCOUNT`, `ALREADY_INVITED`, `DUPLICATE_IN_FILE`, `MISSING_EMAIL`, `INVALID_EMAIL`. Nur `INVITE` und `RENEW` sind auswählbar. |
| `ContactAssessment` | `candidate` + normalisierte `EmailAddress` (falls gültig) + `ContactOutcome`. |
| `ContactInvitationResult` | Ergebnis je versendetem Kontakt: `email`, `outcome` ∈ {`INVITED`, `RENEWED`, `DELIVERY_FAILED`, `SKIPPED`} und bei `SKIPPED` der Grund (`HAS_ACCOUNT`, `ALREADY_INVITED`, `INVALID_EMAIL`, `DUPLICATE_IN_REQUEST`). |

## Bewertungsregeln (Domäne, package-private Klasse `ContactInvitations`)

Reihenfolge je Kontakt in Dateireihenfolge:

1. keine Adresse → `MISSING_EMAIL`
2. Adresse ungültig nach `EmailAddress` → `INVALID_EMAIL`
3. normalisierte Adresse schon bei einem früheren Kontakt der Datei → `DUPLICATE_IN_FILE`
4. Konto mit dieser Adresse (auch Administrator) → `HAS_ACCOUNT`
5. Einladung mit Status `OPEN` und `expiresAt > now` → `ALREADY_INVITED`
6. Einladung mit Status `OPEN` und `expiresAt ≤ now` → `RENEW`
7. sonst (keine Einladung, oder nur `ACCEPTED`/`REVOKED`) → `INVITE`

Beim Versand werden die Regeln 2, 4–7 je Kontakt erneut angewandt;
Doppelte im Request ergeben `SKIPPED/DUPLICATE_IN_REQUEST`.

## Aggregat `Invitation` (Änderung)

| Feld | Typ | Bemerkung |
|---|---|---|
| suggestedIdentity | `SuggestedIdentity?` | Neu. Gesetzt beim Import (Anlegen oder Erneuern) aus dem Kontaktnamen; leer bei Einzeleinladungen. |

Zustandsübergänge (zusätzlich zu 006):

- `issue(email, tokenHash, now, suggestedIdentity?)` – Vorschlag optional.
- `reissue(tokenHash, now, suggestedIdentity?)` – beim Import ersetzt ein
  mitgelieferter Vorschlag den alten; die Einzel-„Erneut senden“-Aktion lässt
  ihn unverändert.
- `accept(...)` und `revoke()` setzen `suggestedIdentity` auf leer.

`InvitationPreview` (Rückgabe von `inspect`) erhält `suggestedIdentity?`.

## Persistenz (`V8__invitation_suggested_identity.sql`)

```text
ALTER TABLE Invitation ADD COLUMN suggestedIdentity TEXT NULL;
```

Keine Datenmigration; bestehende Einladungen haben keinen Vorschlag.
`SqliteSchemaValidator` erwartet die neue Spalte.

## Nicht gespeichert

Die vCard-Datei, alle anderen vCard-Eigenschaften (Telefon, Anschrift,
Geburtstag, UID, …) und die Vorschau selbst werden nicht persistiert.
