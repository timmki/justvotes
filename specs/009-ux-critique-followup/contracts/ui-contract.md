# UI Contract: UX-Nacharbeiten aus der Design-Kritik

Der HTTP-Vertrag (`api-contract/src/main/openapi/justvotes-v1.yaml`) bleibt unverändert.
Dieser Vertrag beschreibt die für Nutzer und Tests verbindlichen Oberflächenmerkmale. Texte sind
de / en angegeben.

## 1. Administrationsbereiche

| Pfad | H1 | Untertitel | Kopfzeilenpfad | Dokumenttitel |
|---|---|---|---|---|
| `/admin/votes` | Stimmen / Votes | Aktuelle Stimmen suchen und bei Bedarf entfernen. / Search current votes and remove them if needed. | Administration › Stimmen | Stimmen · JustVotes |
| `/admin/polls` | Abstimmungen / Polls | Abstimmungen anlegen, veröffentlichen und verwalten. / Create, publish and manage polls. | Administration › Abstimmungen | Abstimmungen · JustVotes |
| `/admin/groups` | Vorlagengruppen / Template groups | Optionsvorlagen zu Gruppen für neue Abstimmungen zusammenstellen. / Combine option templates into groups for new polls. | Administration › Vorlagengruppen | Vorlagengruppen · JustVotes |
| `/admin/templates` | Optionsvorlagen / Option templates | Wiederverwendbare Optionen anlegen, umbenennen und löschen. / Create, rename and delete reusable options. | Administration › Optionsvorlagen | Optionsvorlagen · JustVotes |
| `/admin/accounts` | Konten / Accounts | Konten sperren, entsperren und Einmalpasswörter vergeben. / Lock and unlock accounts and set one-time passwords. | Administration › Konten | Konten · JustVotes |
| `/admin/invitations` | Einladungen / Invitations | Personen per E-Mail oder Kontaktdatei einladen. / Invite people by email or contact file. | Administration › Einladungen | Einladungen · JustVotes |

- Genau eine H1 je Seite; keine Karte direkt darunter wiederholt den Bereichsnamen.
- Der Text „Anmeldung und Verwaltung.“ / „Sign-in and administration.“ existiert nicht mehr.
- Alle übrigen Seiten setzen den Dokumenttitel `<Seitentitel> · JustVotes`.

## 2. Abstimmungsseite, nicht aktiv

Reihenfolge in der Abstimmungskarte:

1. Hinweis (`role="status"` nicht nötig, statischer Inhalt) mit Text
   - abgelaufen: „Diese Abstimmung ist abgelaufen. Eine Stimmabgabe ist nicht mehr möglich.“ /
     „This poll has expired. Voting is no longer possible.“
   - archiviert: „Diese Abstimmung ist archiviert. Eine Stimmabgabe ist nicht mehr möglich.“ /
     „This poll is archived. Voting is no longer possible.“
2. Primär-Link „Ergebnisse ansehen“ / „View results“ → `/poll/results/:pollId`, oder Text
   „Die Ergebnisse sind noch nicht freigegeben.“ / „Results have not been released yet.“
3. Überschrift „Optionen“ / „Options“ und Liste ohne Formularelemente; eigene Stimme mit
   „Eigene Stimme“ / „Your vote“.
4. Links zum Prüfprotokoll (bestehend).

Die Legende „Stimme abgeben“ und Auswahlkreise erscheinen bei nicht aktiven Abstimmungen nicht.

## 3. Administrations-Abstimmungsliste

- Kopf der Seite: Button „Neue Abstimmung“ / „New poll“ (Primär). Öffnet das Panel
  „Neue Abstimmung“ mit Feldern „Titel“ und „Vorlagengruppe“, Aktionen „Speichern“ (Primär) und
  „Abbrechen“.
- Jede Abstimmung: Zeile mit Disclosure-Button (zugänglicher Name = Abstimmungstitel,
  `aria-expanded`), Metazeile „öffentlich · abgelaufen · Ablauf 31.10.2026, 19:50 · 1 Stimme“.
- Aufgeklappt: „Optionen“ (max. 10, dann „Alle N Optionen anzeigen“ / „Show all N options“),
  „Aktionen“ (harmlose zuerst, danach abgesetzte Gruppe gefährlicher Aktionen), Links
  „Abstimmung öffnen · Ergebnisse · Prüfprotokoll“.
- Leerzustand: „Noch keine Abstimmungen.“ / „No polls yet.“ mit „Neue Abstimmung“.

## 4. Formulare

- Jedes Feld: sichtbares `<label>` darüber, optionaler Hinweis darunter, Fehler darunter mit
  `aria-describedby`; `aria-invalid="true"` bei Fehler.
- Primäraktion nur während des Absendens `disabled` + `aria-busy="true"`.
- Pflichtfeld leer beim Absenden: „Bitte fülle dieses Feld aus.“ / „Please fill in this field.“
  (Login E-Mail zusätzlich Format-Fehler über bestehenden Schlüssel `admin.invalidEmail` bzw.
  passenden Auth-Schlüssel).
- Vorlagengruppe anlegen: Labels „Name“ / „Name“ und „Beschreibung (optional)“ /
  „Description (optional)“.

## 5. Beschriftungen

| Alt (de) | Neu (de) | Neu (en) |
|---|---|---|
| Soft löschen | Löschen | Delete |
| Permanent löschen | Endgültig löschen | Delete permanently |
| Vorlagen filtern (Glob) | Vorlagen filtern + Hinweis „* steht für beliebige Zeichen“ | Filter templates + hint “* matches any characters” |
| Lebenszyklus | Status | Status |
| Stimmabgabezeitpunkt (UTC) | Abgestimmt am | Voted on |
| Abstimmung wirklich soft löschen? | Abstimmung „{title}“ löschen? Sie kann wiederhergestellt werden. | Delete poll “{title}”? It can be restored. |
| Abstimmung dauerhaft löschen? … | Abstimmung „{title}“ endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden. | Permanently delete poll “{title}”? This cannot be undone. |
| Vorlagengruppe wirklich löschen? | Vorlagengruppe „{name}“ löschen? | Delete template group “{name}”? |
| Die ausgewählten Optionsvorlagen dauerhaft löschen? | {count} Optionsvorlagen endgültig löschen? | Permanently delete {count} option templates? |

Die zweite Bestätigung für endgültiges Löschen bleibt bestehen.

## 6. User-Seiten

- Startseite ohne aktive Abstimmung: H1 „Keine aktive Abstimmung“, danach Erklärung; „Alle
  Abstimmungen anzeigen“ genau einmal.
- Abstimmungskarte: Datum mit Präfix „Erstellt“ / „Created“ bzw. „Endet“ / „Ends“ / „Endete“ /
  „Ended“.
- Ergebnisseite: Optionsname als Text; Link „Stimmen ansehen“ / „View votes“ nur bei Stimmen > 0.
- Kennzahl-Kachel-Labels ≥ 14 px.
