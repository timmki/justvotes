# ADR 0001: Mitlaufende Polls der Mitgliedergruppe

- **Status**: Angenommen
- **Datum**: 2026-11-01
- **Kontext-Feature**: [specs/008-member-template-group](../../specs/008-member-template-group/spec.md)

## Kontext

Ein Poll übernimmt beim Anlegen einen unveränderlichen Poll-Snapshot seiner Vorlagengruppe.
Für Abstimmungen über Personen soll eine Gruppe „Alle Mitglieder“ immer aktuell sein. Bereits
laufende Abstimmungen aus dieser Gruppe sollen neue Mitglieder ebenfalls als Option erhalten.

## Entscheidung

- Es gibt genau eine vom System gepflegte Mitgliedergruppe (`OptionTemplateGroup.kind = MEMBERS`).
  Sie und ihre Mitglieds-Optionsvorlagen sind manuell nicht änderbar.
- Ein Poll aus dieser Gruppe trägt dauerhaft das Merkmal `followsMembers`. Es wird beim Anlegen
  aus dem Snapshot gesetzt und nicht aus einer Live-Referenz auf den Katalog gelesen.
- Nimmt jemand eine Einladung an, ergänzt das System in derselben Transaktion zuerst die
  Mitgliedergruppe. Danach erhält jeder mitlaufende Poll in `draft` oder `active`, dessen Ende noch
  nicht erreicht ist, die neue Identität als Option mit der Nummer `max + 1`. Das wird als
  Domänenereignis `PollOptionAdded` protokolliert.
- Bestehende Optionen werden nie ersetzt oder umsortiert, weil Stimmen an Optionen hängen.

## Konsequenzen

- Der Poll-Snapshot ist für mitlaufende Polls nur nach vorn erweiterbar. Für alle anderen Polls
  bleibt er unveränderlich.
- Abgeschlossene Polls behalten ihren Stand, damit Ergebnisse stabil bleiben.
- Das Entfernen von Mitgliedern ist zurückgestellt, bis Konten gelöscht werden können.
