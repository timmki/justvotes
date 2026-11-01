# JustVotes

JustVotes verwaltet öffentliche und private Abstimmungen, ihre Optionen und die
Identitäten der angemeldeten Konten, die darin Stimmen abgeben.

## Language

**Identität**:
Eine global in der Instanz gültige `userID`, die eine Person für fachliche Zwecke
repräsentiert. Sie ist fest genau einem User-Konto zugeordnet und nicht frei
wählbar.
_Avoid_: Benutzerkonto, Nutzer

**Konto**:
Ein lokaler, anmeldefähiger Zugang mit E-Mail-Adresse als Anmeldename, Passwort
und Rolle. Die E-Mail-Adresse ist für andere Konten nicht sichtbar. Ein Konto
mit der Rolle User besitzt genau eine feste Identität; das Administratorkonto
besitzt keine. Ein Konto ist Eigentümer einer Identität, kein Synonym dafür.
_Avoid_: Identität, Account

**Rolle**:
Bestimmt die erlaubten Funktionen eines Kontos: `User` sieht und nutzt
Abstimmungen, `Administrator` nutzt ausschließlich die Administration.
_Avoid_: Berechtigungsgruppe

**Einladung**:
Eine vom Administrator für eine E-Mail-Adresse ausgestellte, einmalig nutzbare
und zeitlich begrenzte Berechtigung, ein User-Konto anzulegen.
_Avoid_: Registrierung, Einladungscode

**Stimme**:
Die aktuelle Wahl genau einer Option einer Identität in einem Poll.
_Avoid_: Voting, Ballot

**Stimmabgabe-Ergebnis**:
Das fachliche Ergebnis einer Stimmabgabe: neu abgegeben, ersetzt oder
unverändert, jeweils mit der aktuellen Stimme.
_Avoid_: HTTP-Antwort, Statuscode

**Domänenereignis**:
Ein fachlich bedeutender, bereits eingetretener Vorgang wie eine abgegebene,
ersetzte, zurückgenommene oder administrativ entfernte Stimme.
_Avoid_: Audit-Zeile, Datenbank-Trigger

**Prüfprotokoll**:
Die chronologische, für alle angemeldeten User-Konten lesbare Ansicht der
Domänenereignisse eines Polls.
_Avoid_: Audit Log, Audit

**Vorlagengruppe**:
Eine global benannte Gruppe von Optionsvorlagen, aus der beim Anlegen eines
Polls dessen Optionen übernommen werden.
_Avoid_: Poll-Gruppe, Optionsliste

**Optionsvorlage**:
Eine global benannte, wiederverwendbare Vorlage für eine Poll-Option.
_Avoid_: Option, Poll-Option

**Mitgliedergruppe**:
Die einzige, vom System gepflegte Vorlagengruppe „Alle Mitglieder“. Sie enthält
für jede Identität genau eine Optionsvorlage und lässt sich nicht manuell
bearbeiten.
_Avoid_: automatische Vorlagengruppe, Alle-Gruppe

**Mitlaufender Poll**:
Ein Poll aus der Mitgliedergruppe. Solange er `draft` oder `active` ist, erhält
er neue Mitglieder als zusätzliche Option am Ende; bestehende Optionen und
Stimmen bleiben unverändert.
_Avoid_: dynamischer Poll, Live-Poll

**Vorlagengruppenmitgliedschaft**:
Die Zuordnung einer Optionsvorlage zu einer Vorlagengruppe. Sie wird durch die
Vorlagengruppe verwaltet; die Optionsvorlage kennt die Gruppe nur über deren
Identität.
_Avoid_: eingebettete Vorlage, gemeinsame Entität

**Poll-Snapshot**:
Der unveränderliche, beim Anlegen übernommene Stand der Vorlagengruppe und
ihrer Optionen eines Polls. Einzige Ausnahme sind mitlaufende Polls (siehe
[ADR 0001](docs/adr/0001-mitlaufende-polls-der-mitgliedergruppe.md)).
_Avoid_: Live-Referenz auf den Katalog

**Poll-Lebenszyklus**:
Die Zustandsfolge eines Polls: `draft`, `active`, `expired`, `archived` und
`deleted`; `draft` wird bewusst veröffentlicht, Stimmen sind nur in `active`
zulässig.
_Avoid_: `published | closed` als eigenständiges Zustandsmodell
