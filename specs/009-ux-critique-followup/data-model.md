# Data Model: UX-Nacharbeiten aus der Design-Kritik

Diese Feature ändert keine fachlichen Daten, keinen HTTP-Vertrag und kein Datenbankschema.
Alle benötigten Werte liegen in den bestehenden Schemas vor (`Poll.state`, `Poll.visibility`,
`Poll.endsAt`, `Poll.totalVotes`, `PollResults.options[].votes`). Neu sind nur Ableitungen und
lokaler UI-Zustand im Frontend.

## Abgeleitete Darstellungswerte

### AdminSection
| Feld | Werte | Quelle |
|---|---|---|
| `section` | `votes`, `polls`, `groups`, `templates`, `accounts`, `invitations` | Pfad `/admin/<section>` (bestehend; `/admin` und `/admin/create` wie heute) |
| `titleKey` | `admin.votes` … `admin.invitations` | bestehende Navigationsschlüssel |
| `descriptionKey` | `admin.sectionDescription.<section>` | neu, de/en |

### PollAvailability (Abstimmungsseite)
| Zustand von `Poll.state` | Darstellung |
|---|---|
| `active` | bestehende Stimmabgabe (unverändert) |
| `expired` | `PollClosedNotice` mit Grund „abgelaufen“ + schreibgeschützte Optionsliste |
| `archived` | `PollClosedNotice` mit Grund „archiviert“ + schreibgeschützte Optionsliste |
| übrige (`draft`, `deleted`) | wie heute nicht für User erreichbar; falls doch, Grund über bestehenden Statusnamen |

| Ergebnis-Abfrage | Hinweisaktion |
|---|---|
| erfolgreich geladen | Primär-Link „Ergebnisse ansehen“ |
| `results-unavailable` / Fehler | Text „Die Ergebnisse sind noch nicht freigegeben.“ |
| ausstehend | Text „Ergebnisse werden geprüft …“ (bestehender Schlüssel) |

### ResultOptionAction (Ergebnisseite)
- „Stimmen ansehen“ wird nur angezeigt, wenn `option.votes > 0`.

## Lokaler UI-Zustand

### AdminPollListState (in `AdminPolls`)
| Feld | Typ | Regeln |
|---|---|---|
| `expandedPollIds` | Menge von Poll-IDs | anfangs leer; bleibt bei Cache-Aktualisierung erhalten; nach Anlegen wird die neue ID ergänzt; nach endgültigem Löschen wird die ID entfernt |
| `createOpen` | boolesch | „Neue Abstimmung“ setzt `true`; Abbrechen oder erfolgreiches Speichern setzt `false`; Fokus beim Öffnen ins Titelfeld, beim Schließen zurück auf „Neue Abstimmung“ |
| `showAllOptions` | je Poll-ID boolesch | nur relevant bei mehr als 10 Optionen |

### FormFieldState (in `FormField`)
| Feld | Regeln |
|---|---|
| `error` | wird erst nach einem Absendeversuch gesetzt; Eingabe im Feld löscht den Fehler dieses Feldes |
| `aria-invalid` / `aria-describedby` | gesetzt, solange `error` vorhanden ist |

### PrimaryActionState
| Zustand | Darstellung |
|---|---|
| bereit | gefüllt, bedienbar – auch bei leeren Feldern |
| sendet | gesperrt, `aria-busy`, Ladeanzeige |
