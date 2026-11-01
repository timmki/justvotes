# API-Änderungen (`api-contract/src/main/openapi/justvotes-v1.yaml`)

Alle Änderungen sind additiv. Bestehende Clients bleiben kompatibel.

## Schemas

```yaml
TemplateGroupKind:
  type: string
  enum: [manual, members]

TemplateGroup:            # + kind (optional, vom Server immer gesendet; fehlt = manual)
  properties:
    kind:
      $ref: '#/components/schemas/TemplateGroupKind'

Template:                 # + managed (optional, vom Server immer gesendet; fehlt = false)
  properties:
    managed:
      type: boolean
      description: true für Mitglieds-Optionsvorlagen; nicht umbenenn- oder löschbar.
```

`Poll.templateGroup` übernimmt `kind` aus dem Snapshot. `kind = members` heißt, dass der Poll den Mitgliedern folgt.

## Prüfprotokoll

Neuer Ereignistyp `PollOptionAdded`:

```yaml
eventType: PollOptionAdded
details:
  optionNumber: integer
  optionText: string
  reason: member-joined
```

## Fehler

| Endpunkt (bestehend) | Bedingung | Status | `code` |
|----------------------|-----------|--------|--------|
| Gruppe umbenennen / löschen | Gruppe ist `members` | 409 | `catalog-item-managed` |
| Vorlage der Gruppe zuordnen / aus ihr entfernen | Gruppe ist `members` | 409 | `catalog-item-managed` |
| Vorlage umbenennen / löschen | `managed = true` | 409 | `catalog-item-managed` |

Neue Endpunkte gibt es nicht.
