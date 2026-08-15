# JustVotes

JustVotes verwaltet öffentliche und private Abstimmungen, ihre Optionen und die
anonymen Identitäten, die darin Stimmen abgeben.

## Language

**Identität**:
Eine global in der Instanz gültige, frei gewählte `userID`, die eine Person für
fachliche Zwecke repräsentiert.
_Avoid_: Benutzerkonto, Nutzer

**Stimme**:
Die aktuelle Wahl genau einer Option einer Identität in einem Poll.
_Avoid_: Voting, Ballot

**Stimmabgabe-Ergebnis**:
Das fachliche Ergebnis einer Stimmabgabe: neu abgegeben, ersetzt oder
unverändert, jeweils mit der aktuellen Stimme.
_Avoid_: HTTP-Antwort, Statuscode

**Domänenereignis**:
Ein fachlich bedeutender, bereits eingetretener Vorgang wie eine abgegebene,
ersetzte oder beim Identitätswechsel entfernte Stimme.
_Avoid_: Audit-Zeile, Datenbank-Trigger

**Vorlagengruppe**:
Eine global benannte Gruppe von Optionsvorlagen, aus der beim Anlegen eines
Polls dessen Optionen übernommen werden.
_Avoid_: Poll-Gruppe, Optionsliste

**Optionsvorlage**:
Eine global benannte, wiederverwendbare Vorlage für eine Poll-Option.
_Avoid_: Option, Poll-Option

**Vorlagengruppenmitgliedschaft**:
Die Zuordnung einer Optionsvorlage zu einer Vorlagengruppe. Sie wird durch die
Vorlagengruppe verwaltet; die Optionsvorlage kennt die Gruppe nur über deren
Identität.
_Avoid_: eingebettete Vorlage, gemeinsame Entität

**Poll-Snapshot**:
Der unveränderliche, beim Anlegen übernommene Stand der Vorlagengruppe und
ihrer Optionen eines Polls.
_Avoid_: Live-Referenz auf den Katalog

**Poll-Lebenszyklus**:
Die Zustandsfolge eines Polls: `draft`, `active`, `expired`, `archived` und
`deleted`; `draft` wird bewusst veröffentlicht, Stimmen sind nur in `active`
zulässig.
_Avoid_: `published | closed` als eigenständiges Zustandsmodell
