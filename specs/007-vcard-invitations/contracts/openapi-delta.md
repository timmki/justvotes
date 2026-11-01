# OpenAPI-Delta: Einladungen aus einer vCard-Datei

Änderungen an [`justvotes-v1.yaml`](../../../api-contract/src/main/openapi/justvotes-v1.yaml).
Version: `2.1.0` (additiv; bestehende Operationen unverändert).
Alle neuen Operationen: Rolle Administrator, Sitzung + CSRF, `Cache-Control: no-store`.

## `POST /admin/invitations/contact-import/preview`

`operationId: previewContactImport`

- **Request body**: `text/vcard` (auch `text/x-vcard` und `text/plain` akzeptiert), Inhalt der Datei als UTF-8, ≤ 1 MB.
- **200** `ContactImportPreview`
- **400** `contact-import-invalid` (keine vCard, kein Kontakt lesbar) · `contact-import-too-many` (> 500 Kontakte)
- **413** `contact-import-too-large` (> 1 MB)
- **409** `invitation-delivery-unavailable` (Mailversand nicht eingerichtet)
- **401/403** wie übrige Admin-Operationen

```yaml
ContactImportPreview:
  required: [contacts, unreadableEntries]
  properties:
    contacts:
      type: array
      items: { $ref: '#/components/schemas/ContactImportEntry' }
    unreadableEntries:
      type: integer
      description: Anzahl beschädigter Einträge, die nicht gelesen werden konnten.
ContactImportEntry:
  required: [position, outcome]
  properties:
    position: { type: integer, minimum: 1 }
    name: { type: string, nullable: true }
    email: { type: string, nullable: true }
    outcome:
      type: string
      enum: [invite, renew, has-account, already-invited, duplicate-in-file, missing-email, invalid-email]
```

## `POST /admin/invitations/contact-import`

`operationId: importContacts`

- **Request body** `ContactImportRequest` (JSON)
- **200** `ContactImportResult`
- **400** `invalid-request` (leere Liste) · `contact-import-too-many` (> 500)
- **409** `invitation-delivery-unavailable`

```yaml
ContactImportRequest:
  required: [contacts]
  properties:
    locale: { $ref: '#/components/schemas/InvitationLocale' }   # neu: aus InvitationRequest.locale (enum de, en) herausgezogen und dort ebenfalls referenziert
    contacts:
      type: array
      minItems: 1
      maxItems: 500
      items:
        required: [email]
        properties:
          email: { type: string, minLength: 3, maxLength: 254 }
          name: { type: string, nullable: true, maxLength: 256 }
ContactImportResult:
  required: [invited, renewed, deliveryFailed, entries]
  properties:
    invited: { type: integer }
    renewed: { type: integer }
    deliveryFailed: { type: integer }
    entries:
      type: array
      items:
        required: [email, outcome]
        properties:
          email: { type: string }
          outcome: { type: string, enum: [invited, renewed, delivery-failed, skipped] }
          reason:
            type: string
            nullable: true
            enum: [has-account, already-invited, invalid-email, duplicate-in-request]
```

## Änderung `InvitationPreview` (`POST /invitations/inspection`)

```yaml
InvitationPreview:
  properties:
    suggestedUserID:
      type: string
      nullable: true
      description: Vorgeschlagener Anzeigename aus einer importierten vCard; änderbar.
```

Additiv und optional; bestehende Clients bleiben gültig.

## Status-Matrix

- `400`: zusätzlich `contact-import-invalid`, `contact-import-too-many`
- `413`: neu, `contact-import-too-large`
