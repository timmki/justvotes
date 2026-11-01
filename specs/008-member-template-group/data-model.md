# Data Model: Mitgliedergruppe

## OptionTemplateGroup (template-catalog) – erweitert

| Feld | Typ | Regel |
|------|-----|-------|
| kind | `TemplateGroupKind` (`MANUAL`, `MEMBERS`) | Default `MANUAL`. Höchstens eine Gruppe mit `MEMBERS` (partieller Unique-Index). |

- Bei `kind = MEMBERS` lösen `rename`, `description`, `addTemplate`, `removeTemplate` (manuell) und `delete` den Fehler `CatalogItemManagedException` aus.
- Die Mitgliedschaften pflegt ausschließlich `SyncMemberTemplates`.

## OptionTemplate (template-catalog) – erweitert

| Feld | Typ | Regel |
|------|-----|-------|
| memberIdentity | optional `String` | Gesetzt, wenn die Vorlage eine Identität repräsentiert. Gespeichert als `memberIdentityKey` (normalisiert, unique). |

- Ist `memberIdentity` gesetzt, sind `rename` und `delete` gesperrt, ebenso das Entfernen aus der Mitgliedergruppe.
- Weitere manuelle Zuordnungen zu anderen Gruppen bleiben erlaubt.

## Poll (poll-management) – erweitert

| Feld | Typ | Regel |
|------|-----|-------|
| followsMembers | `boolean` | Wird beim Anlegen aus `TemplateGroupSnapshot.followsMembers` gesetzt und ist danach unveränderlich. |

**Neu: `addMemberOption(String text, Instant at) → Optional<PollOptionAdded>`**

Die Methode gibt `Optional.empty()` zurück, wenn
- `followsMembers` falsch ist,
- der Zustand nicht `DRAFT` oder `ACTIVE` ist,
- `endsAt` gesetzt und `<= at` ist (Ende bereits erreicht, auch wenn der Zustand noch nicht umgestellt wurde), oder
- der Text normalisiert schon vorhanden ist (idempotent, FR-011).

`replaceOptions` bleibt für mitlaufende Entwürfe erlaubt (FR-014).

Andernfalls hängt sie eine `Option(max+1, text)` an `options` und an `templateSnapshotOptions` an. Bestehende Optionen und Stimmen bleiben unverändert.

## TemplateGroupSnapshot – erweitert

`+ boolean followsMembers`. Er ist `true`, wenn die Quellgruppe `kind = MEMBERS` hat.

## PollOptionAdded (Domänenereignis, neu)

| Feld | Bedeutung |
|------|-----------|
| pollId | betroffener Poll |
| optionNumber | Nummer der neuen Option |
| optionText | Identität |
| reason | `MEMBER_JOINED` |
| occurredAt | UTC-Zeitpunkt |

Das Ereignis wird im Prüfprotokoll angezeigt. Akteur ist „System“.

## Schema (V9)

```text
OptionTemplateGroup + kind TEXT NOT NULL DEFAULT 'MANUAL' CHECK (kind IN ('MANUAL','MEMBERS'))
  UNIQUE INDEX ... (kind) WHERE kind = 'MEMBERS'
OptionTemplate      + memberIdentityKey TEXT UNIQUE NULL
Poll                + followsMembers INTEGER NOT NULL DEFAULT 0
Backfill:
  - Gruppe „Alle Mitglieder“ wird angelegt; eine manuelle Gruppe gleichen Namens wird zuvor umbenannt.
  - Für jedes Account mit role='USER' wird eine OptionTemplate (name = identity) angelegt oder übernommen,
    jeweils mit Mitgliedschaft in der Gruppe.
```

## Ablauf „Mitglied kommt hinzu“

```text
accept(token, identity, pw)                [eine Transaktion]
 └─ Account.createUser → save
 └─ MemberJoinedListener.memberJoined(identity)
     ├─ SyncMemberTemplates.memberJoined   → Vorlage anlegen/übernehmen, Gruppe zuordnen
     └─ ExtendMemberPolls.memberJoined     → für jeden Poll mit followsMembers in DRAFT/ACTIVE:
                                              addMemberOption → speichern + PollOptionAdded publizieren
```
