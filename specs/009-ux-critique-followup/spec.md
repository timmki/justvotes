# Feature Specification: UX-Nacharbeiten aus der Design-Kritik

**Feature Branch**: `009-ux-critique-followup`

**Created**: 2026-11-01

**Status**: Draft

**Input**: User description: "Erzeuge eine Spec für die obigen Vorschläge" – Grundlage ist die
Design-Kritik vom 2026-11-01 (Login, alle sechs Administrationsbereiche, Startseite,
Abstimmungsliste, Abstimmungsseite, Ergebnisseite und persönliches Profil; Desktop 1280×860 px
und mobil 375×812 px; Testdaten mit einer abgelaufenen öffentlichen Abstimmung mit 25 Optionen,
einer gelöschten und einer privaten Entwurfs-Abstimmung).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Jeder Administrationsbereich nennt sich selbst (Priority: P1)

Eine Person mit der Rolle Administrator wechselt über die Seitenleiste zwischen den
Bereichen Stimmen, Abstimmungen, Vorlagengruppen, Optionsvorlagen, Konten und Einladungen.
Heute zeigt jede dieser Seiten dieselbe große Überschrift „Administration“ mit dem
Untertitel „Anmeldung und Verwaltung.“; der eigentliche Bereich steht nur klein im
Kartenkopf, und die Kopfzeile wiederholt „Administration“. Künftig ist der Bereichsname die
Seitenüberschrift, ein kurzer Untertitel beschreibt, was man dort tut, und die Kopfzeile
zeigt den Pfad „Administration › Bereich“ – so wie die User-Seiten bereits „Startseite ›
Seite“ zeigen.

**Why this priority**: Orientierung ist die Grundlage jeder weiteren Arbeit im
Administrationsbereich. Die Änderung ist klein, betrifft alle sechs Seiten und spart auf
jeder Seite Platz oberhalb des eigentlichen Inhalts.

**Independent Test**: Als Administrator jeden der sechs Bereiche öffnen und prüfen, dass
Überschrift, Untertitel, Kopfzeilenpfad und Browser-Tab-Titel den Bereich nennen und kein
doppelter Bereichstitel im Inhalt verbleibt.

**Acceptance Scenarios**:

1. **Given** eine angemeldete Person mit der Rolle Administrator, **When** sie einen
   Administrationsbereich öffnet, **Then** lautet die Seitenüberschrift wie der
   Navigationseintrag dieses Bereichs (z. B. „Konten“), und „Administration“ erscheint
   nicht mehr als Seitenüberschrift.
2. **Given** ein geöffneter Administrationsbereich, **When** der Untertitel angezeigt wird,
   **Then** beschreibt er die Aufgabe des Bereichs in einem Satz (z. B. für Konten:
   „Konten sperren, entsperren und Einmalpasswörter vergeben.“), und der Text „Anmeldung und
   Verwaltung.“ kommt nirgends mehr vor.
3. **Given** ein geöffneter Administrationsbereich, **When** die Kopfzeile angezeigt wird,
   **Then** zeigt sie den Pfad „Administration › Bereichsname“ in derselben Optik wie der
   Zurück-Pfad der User-Seiten; „Administration“ ist dabei nicht verlinkt, weil es keine eigene
   Seite ist.
4. **Given** ein geöffneter Administrationsbereich, **When** der Inhalt angezeigt wird,
   **Then** wiederholt keine Karte direkt unter der Überschrift denselben Bereichsnamen als
   eigene Überschrift.
5. **Given** ein geöffneter Administrationsbereich, **When** der Browser-Tab betrachtet
   wird, **Then** enthält der Dokumenttitel den Bereichsnamen und „JustVotes“.

---

### User Story 2 - Nicht aktive Abstimmung zeigt zuerst das Ergebnis (Priority: P1)

Ein User öffnet eine Abstimmung, die nicht mehr aktiv ist (abgelaufen oder archiviert).
Heute steht oben weiter „Stimme abgeben“ mit allen Optionen in blasser Darstellung; der
Hinweis, dass keine Stimmabgabe möglich ist, und der Link zu den Ergebnissen stehen erst am
Ende der Seite, bei 25 Optionen rund zwei Bildschirmhöhen weiter unten. Künftig steht
direkt unter dem Titel ein Hinweis mit dem Grund und einer deutlichen Aktion „Ergebnisse
ansehen“. Die Optionen erscheinen als nicht bedienbare, gut lesbare Liste mit markierter
eigener Stimme, nicht als gesperrtes Formular.

**Why this priority**: Nach Ablauf will praktisch jede Person das Ergebnis sehen. Ein
Formular, das man nicht benutzen kann, an erster Stelle ist der häufigste Stolperstein der
User-Seiten, und die blassen Optionen erfüllen die Kontrastanforderung nicht.

**Independent Test**: Eine abgelaufene Abstimmung mit vielen Optionen als User öffnen und
prüfen, dass Hinweis und Ergebnisaktion ohne Scrollen sichtbar sind, die eigene Stimme
erkennbar ist und kein Element den Eindruck einer möglichen Stimmabgabe erweckt.

**Acceptance Scenarios**:

1. **Given** eine abgelaufene Abstimmung mit freigegebenen Ergebnissen, **When** ein User
   sie öffnet, **Then** stehen direkt unter Titel und Faktenzeile ein Hinweis
   („Diese Abstimmung ist abgelaufen. Eine Stimmabgabe ist nicht mehr möglich.“) und eine
   hervorgehobene Aktion „Ergebnisse ansehen“, ohne Scrollen sichtbar bei 1280×860 px und
   bei 375×812 px.
2. **Given** eine archivierte Abstimmung, **When** ein User sie öffnet, **Then** nennt der
   Hinweis den Grund „archiviert“ statt „abgelaufen“.
3. **Given** eine nicht aktive Abstimmung, **When** die Optionen angezeigt werden, **Then**
   tragen sie die Überschrift „Optionen“ statt „Stimme abgeben“, haben keine Auswahlkreise
   und erreichen den normalen Textkontrast (mindestens 4,5:1).
4. **Given** der User hat in der nicht aktiven Abstimmung eine Stimme, **When** die Optionen
   angezeigt werden, **Then** ist die gewählte Option als „Eigene Stimme“ markiert.
5. **Given** die Ergebnisse der nicht aktiven Abstimmung sind nicht freigegeben, **When** ein
   User sie öffnet, **Then** erklärt der Hinweis, dass die Ergebnisse noch nicht freigegeben
   sind, und es gibt keine Aktion „Ergebnisse ansehen“.
6. **Given** eine aktive Abstimmung, **When** ein User sie öffnet, **Then** bleibt die
   bestehende Stimmabgabe unverändert.

---

### User Story 3 - Kompakte Abstimmungsliste in der Administration (Priority: P2)

Ein Administrator verwaltet viele Abstimmungen. Heute zeigt die Liste jede Abstimmung mit
allen Optionen, allen Aktionen und allen Links vollständig ausgeklappt; schon drei
Abstimmungen ergeben eine Seite von rund 2800 px Höhe, und das Formular „Abstimmung
erstellen“ steht dauerhaft darüber. Künftig zeigt die Liste je Abstimmung eine kompakte
Zeile mit Titel, Sichtbarkeit, Status, Ablauf und Stimmenzahl. Optionen und Aktionen
erscheinen erst, wenn der Administrator die Abstimmung aufklappt. Eine neue Abstimmung
legt er über eine Aktion „Neue Abstimmung“ an, die das Formular öffnet.

**Why this priority**: Die Seite ist mit wachsender Zahl an Abstimmungen kaum noch zu
überblicken, und gefährliche Aktionen liegen in einer langen Liste nah an harmlosen. Die
Funktion bleibt aber heute erreichbar, deshalb P2.

**Independent Test**: Mit mindestens drei Abstimmungen in verschiedenen Zuständen die
Abstimmungsliste öffnen, prüfen, dass alle Abstimmungen ohne Scrollen bei 1280×860 px
sichtbar sind, eine aufklappen, eine Aktion ausführen und eine neue Abstimmung anlegen.

**Acceptance Scenarios**:

1. **Given** mehrere Abstimmungen, **When** ein Administrator die Abstimmungsliste öffnet,
   **Then** sind alle Abstimmungen zugeklappt und zeigen je Titel, Sichtbarkeit (öffentlich
   oder privat), Status, Ablaufzeitpunkt oder „kein Ablauf gesetzt“ und Stimmenzahl.
2. **Given** eine zugeklappte Abstimmung, **When** der Administrator sie per Maus, Touch oder
   Tastatur aufklappt, **Then** erscheinen ihre Optionen, die im aktuellen Status erlaubten
   Aktionen und die Links zu Abstimmung, Ergebnissen und Prüfprotokoll; der aufgeklappte
   Zustand ist für Screenreader angekündigt.
3. **Given** die Abstimmungsliste, **When** der Administrator „Neue Abstimmung“ wählt,
   **Then** öffnet sich das Formular mit Titel und Vorlagengruppe, der Fokus liegt im
   Titelfeld, und Abbrechen schließt es ohne Änderung.
4. **Given** eine neue Abstimmung wurde gespeichert, **When** die Liste aktualisiert wird,
   **Then** ist das Formular geschlossen und die neue Abstimmung aufgeklappt und sichtbar.
5. **Given** eine Abstimmung mit vielen Optionen ist aufgeklappt, **When** die Optionen
   angezeigt werden, **Then** sind höchstens zehn Optionen sofort sichtbar und die übrigen
   über „Alle N Optionen anzeigen“ erreichbar.
6. **Given** der Administrator führt eine Aktion in einer aufgeklappten Abstimmung aus,
   **When** die Liste danach aktualisiert wird, **Then** bleibt diese Abstimmung aufgeklappt.

---

### User Story 4 - Einheitliche Formulare und klare Primäraktionen (Priority: P2)

Formulare sehen heute je nach Seite unterschiedlich aus: Labels sind mal fett und klein,
mal normal und größer; Eingabefelder haben verschiedene Höhen; manche Felder haben kein
sichtbares Label; Primäraktionen sind mal voll gefüllt, mal blass deaktiviert, mal nur
umrandet. Der Login-Button ist blass und gesperrt, bis beide Felder ausgefüllt sind, ohne
dass gesagt wird, warum. Künftig folgen alle Formulare einem gemeinsamen Muster, und jede
Primäraktion ist bedienbar und meldet fehlende Angaben erst beim Absenden direkt am Feld.

**Why this priority**: Uneinheitliche Formulare kosten bei jeder Eingabe Aufmerksamkeit,
und ein scheinbar defekter Login-Button ist der erste Eindruck der Anwendung.

**Independent Test**: Login, „Abstimmung erstellen“, „Neue Vorlagengruppe“, „Gruppe
umbenennen“, „Neue Optionsvorlage“, „Mehrere Vorlagen“, Vorlagenfilter, „Person einladen“
und „Passwort ändern“ nebeneinander vergleichen und jeweils leer absenden.

**Acceptance Scenarios**:

1. **Given** ein beliebiges Formular der Anwendung, **When** es angezeigt wird, **Then** hat
   jedes Eingabefeld ein sichtbares Label über dem Feld in einheitlicher Schriftgröße und
   -stärke; ein Placeholder ersetzt nie ein Label.
2. **Given** das Formular „Neue Vorlagengruppe“, **When** es angezeigt wird, **Then** tragen
   die Felder die Labels „Name“ und „Beschreibung (optional)“.
3. **Given** ein beliebiges einzeiliges Eingabefeld oder Auswahlfeld, **When** es angezeigt
   wird, **Then** hat es dieselbe Höhe, Schrift und Rahmendarstellung wie alle anderen;
   mehrzeilige Felder nutzen dieselbe Schrift wie einzeilige, auch im Placeholder.
4. **Given** ein Formular, **When** es angezeigt wird, **Then** hat es genau eine gefüllte
   Primäraktion; weitere Aktionen sind umrandet oder als Text dargestellt.
5. **Given** die Login-Seite mit leeren Feldern, **When** die Person „Anmelden“ auslöst,
   **Then** ist der Button bedienbar, es wird keine Anmeldung gesendet, und jedes leere
   Pflichtfeld zeigt eine Meldung direkt am Feld, die Screenreadern zugeordnet ist; der Fokus
   springt auf das erste fehlerhafte Feld.
6. **Given** ein Formular wird gerade gesendet, **When** die Primäraktion angezeigt wird,
   **Then** ist sie gegen doppeltes Absenden gesperrt und zeigt einen Ladezustand; das ist
   der einzige Fall, in dem eine Primäraktion gesperrt dargestellt wird.
7. **Given** eine aktive Abstimmung mit Auswahlkreisen, **When** die Optionen angezeigt
   werden, **Then** steht zwischen Auswahlkreis und Optionstext ein sichtbarer Abstand.

---

### User Story 5 - Verständliche Begriffe und abgegrenzte gefährliche Aktionen (Priority: P3)

Administratoren und User stoßen heute auf Fachjargon („Soft löschen“, „Permanent löschen“,
„Vorlagen filtern (Glob)“, „Lebenszyklus“, „Stimmabgabezeitpunkt (UTC)“). Gefährliche
Aktionen wie „Permanent löschen“, „Stimme entfernen“ oder „Sperren“ stehen gleich gestaltet
direkt neben harmlosen, nur die Schriftfarbe unterscheidet sie. Künftig sind die Begriffe
allgemein verständlich, gefährliche Aktionen sind räumlich abgesetzt, und jede Bestätigung
nennt das betroffene Objekt.

**Why this priority**: Verbessert Sicherheit und Verständlichkeit, ist aber durch die
bestehenden Bestätigungsabfragen bereits teilweise abgesichert.

**Independent Test**: Die betroffenen Beschriftungen in Deutsch und Englisch prüfen und je
eine gefährliche Aktion in Abstimmungen, Stimmen, Konten und Optionsvorlagen auslösen und
abbrechen.

**Acceptance Scenarios**:

1. **Given** die Administration, **When** Aktionen einer Abstimmung angezeigt werden,
   **Then** heißt „Soft löschen“ nun „Löschen“ und „Permanent löschen“ nun „Endgültig
   löschen“; Englisch entsprechend „Delete“ und „Delete permanently“.
2. **Given** ein Vorlagenfilter, **When** er angezeigt wird, **Then** lautet das Label
   „Vorlagen filtern“ mit dem Hinweis „* steht für beliebige Zeichen“; das Wort „Glob“
   erscheint nicht.
3. **Given** das persönliche Profil, **When** eine Stimme angezeigt wird, **Then** heißen die
   Spalten „Status“ und „Abgestimmt am“, und der Zeitpunkt erscheint in der lokalen Zeit der
   Person im selben Format wie andere Zeitpunkte der Anwendung, ohne „UTC“.
4. **Given** eine Gruppe von Aktionen mit mindestens einer gefährlichen Aktion, **When** sie
   angezeigt wird, **Then** steht die gefährliche Aktion räumlich abgesetzt am Ende der
   Gruppe und ist zusätzlich zur Farbe durch eine eigene Darstellung erkennbar. Gefährliche
   Aktionen sind: Löschen und Endgültig löschen (Abstimmung), Löschen (Vorlagengruppe),
   Ausgewählte löschen (Optionsvorlagen), Sperren (Konto), Widerrufen (Einladung) und Stimme
   entfernen.
5. **Given** eine gefährliche Aktion, **When** sie ausgelöst wird, **Then** nennt die
   Bestätigung das betroffene Objekt (Abstimmungstitel, Konto-E-Mail, Name der Optionsvorlage
   oder Vorlagengruppe, bei Stimmen Abstimmung und Identität), und Abbrechen ändert nichts.
6. **Given** die Bestätigung für „Endgültig löschen“, **When** sie angezeigt wird, **Then**
   bleibt die bestehende zweistufige Bestätigung erhalten.

---

### User Story 6 - Kleine Klarheitsverbesserungen auf den User-Seiten (Priority: P3)

Einige Stellen der User-Seiten lesen sich holprig: Auf der Startseite steht die Erklärung
„Aktuell gibt es keine aktive öffentliche Abstimmung.“ über der Überschrift „Keine aktive
Abstimmung“, und „Alle Abstimmungen anzeigen“ erscheint zweimal. Abstimmungskarten zeigen
ein Datum ohne Angabe, was es bedeutet. Auf der Ergebnisseite ist jeder Optionsname ein
unterstrichener Link, ohne dass erkennbar ist, dass er zur Liste der Stimmen dieser Option
führt.

**Why this priority**: Geringer Aufwand, verbessert die Lesbarkeit, blockiert aber keinen
Ablauf.

**Independent Test**: Startseite ohne aktive Abstimmung, Abstimmungsliste und Ergebnisseite
einer abgelaufenen Abstimmung als User prüfen.

**Acceptance Scenarios**:

1. **Given** keine aktive öffentliche Abstimmung, **When** die Startseite angezeigt wird,
   **Then** folgt die Erklärung der Überschrift „Keine aktive Abstimmung“, und „Alle
   Abstimmungen anzeigen“ erscheint auf der Startseite genau einmal.
2. **Given** eine Abstimmungskarte auf Startseite oder Abstimmungsliste, **When** ein Datum
   angezeigt wird, **Then** steht davor, was es bezeichnet („Erstellt“ oder „Endet“ bzw.
   „Endete“).
3. **Given** die Ergebnisseite, **When** die Optionen angezeigt werden, **Then** ist der
   Optionsname normaler Text, und jede Option mit mindestens einer Stimme bietet eine
   eindeutig beschriftete Aktion „Stimmen ansehen“, die zur bisherigen Optionsseite führt;
   Optionen ohne Stimmen bieten diese Aktion nicht an.
4. **Given** die Kennzahlen-Kacheln auf Startseite und Stimmen-Übersicht, **When** sie
   angezeigt werden, **Then** sind ihre Beschriftungen mindestens 14 px groß.

---

### Edge Cases

- Eine Abstimmung läuft ab, während ein User die Abstimmungsseite geöffnet hat: Beim
  nächsten Laden oder einem Fehler „nicht mehr aktiv“ beim Absenden wechselt die Seite in
  die Darstellung aus User Story 2.
- Eine nicht aktive Abstimmung, in der der User keine Stimme hat: Keine Option ist als
  „Eigene Stimme“ markiert, der Hinweis bleibt gleich.
- Eine Abstimmung mit nur einer Option oder ohne Stimmen: Die Ergebnisaktion ist trotzdem
  vorhanden, sofern die Ergebnisse freigegeben sind.
- Die Abstimmungsliste der Administration ist leer: Es erscheint ein Leerzustand mit der
  Aktion „Neue Abstimmung“.
- Das Formular „Neue Abstimmung“ ist offen und enthält Eingaben, wenn der Administrator
  eine andere Abstimmung aufklappt: Die Eingaben bleiben erhalten.
- Sehr lange Titel oder Optionsnamen in der kompakten Liste: Sie brechen um, statt die
  Zeile oder die Seite horizontal zu verbreitern.
- Englische Oberfläche: Alle neuen und geänderten Texte (Überschriften, Untertitel, Hinweise,
  Beschriftungen, Bestätigungen) liegen in Deutsch und Englisch vor.
- Mobile Ansicht: Kopfzeilenpfad, aufklappbare Liste, Hinweis und abgesetzte gefährliche
  Aktionen funktionieren bei 375 px Breite ohne horizontales Scrollen.

## Requirements *(mandatory)*

### Functional Requirements

**Administrationsbereiche (US1)**

- **FR-001**: Jeder Administrationsbereich MUST den Bereichsnamen als einzige
  Seitenüberschrift der Ebene 1 zeigen.
- **FR-002**: Jeder Administrationsbereich MUST einen eigenen, einsätzigen Untertitel
  in Deutsch und Englisch zeigen.
- **FR-003**: Die Kopfzeile MUST in Administrationsbereichen den Pfad „Administration ›
  Bereichsname“ zeigen.
- **FR-004**: Inhaltskarten direkt unter der Überschrift MUST NOT den Bereichsnamen als
  eigene Überschrift wiederholen.
- **FR-005**: Der Dokumenttitel MUST auf allen Seiten den Seitennamen und „JustVotes“
  enthalten. Ausnahme ist die Startseite, deren Überschrift nur für Screenreader sichtbar ist:
  Sie ist die Anwendung selbst, ihr Dokumenttitel lautet nur „JustVotes“.

**Nicht aktive Abstimmung (US2)**

- **FR-006**: Bei einer abgelaufenen oder archivierten Abstimmung MUST die Abstimmungsseite
  direkt unter der Faktenzeile einen Hinweis mit dem Grund zeigen, warum keine Stimmabgabe
  möglich ist.
- **FR-007**: Sind die Ergebnisse freigegeben, MUST der Hinweis eine hervorgehobene Aktion
  „Ergebnisse ansehen“ enthalten; sonst MUST er erklären, dass die Ergebnisse noch nicht
  freigegeben sind.
- **FR-008**: Bei einer nicht aktiven Abstimmung MUST die Optionsliste ohne Auswahlelemente,
  mit normalem Textkontrast und unter der Überschrift „Optionen“ erscheinen.
- **FR-009**: Bei einer nicht aktiven Abstimmung MUST eine vorhandene eigene Stimme in der
  Optionsliste als „Eigene Stimme“ markiert sein.

**Administrations-Abstimmungsliste (US3)**

- **FR-010**: Die Abstimmungsliste der Administration MUST Abstimmungen standardmäßig
  zugeklappt zeigen, mit Titel, Sichtbarkeit, Status, Ablauf und Stimmenzahl.
- **FR-011**: Administratoren MUST eine Abstimmung per Maus, Touch und Tastatur auf- und
  zuklappen können; der Zustand MUST für Hilfstechnologien erkennbar sein.
- **FR-012**: Eine aufgeklappte Abstimmung MUST dieselben Optionen, statusabhängigen
  Aktionen und Links bieten wie heute.
- **FR-013**: Eine aufgeklappte Abstimmung mit mehr als zehn Optionen MUST zunächst zehn
  Optionen und eine Aktion zum Anzeigen aller Optionen zeigen.
- **FR-014**: Das Anlegen einer Abstimmung MUST über eine Aktion „Neue Abstimmung“ erfolgen,
  die das Formular öffnet; das Formular MUST NOT dauerhaft über der Liste stehen.
- **FR-015**: Der Auf- oder Zugeklappt-Zustand einer Abstimmung MUST nach einer darin
  ausgeführten Aktion erhalten bleiben.

**Formulare (US4)**

- **FR-016**: Jedes Eingabe- und Auswahlfeld MUST ein sichtbares, programmatisch
  verknüpftes Label in einheitlicher Darstellung haben.
- **FR-017**: Einzeilige Eingabefelder und Auswahlfelder MUST einheitliche Höhe, Schrift und
  Rahmendarstellung haben; mehrzeilige Felder MUST dieselbe Schrift verwenden.
- **FR-018**: Jedes Formular MUST genau eine gefüllt dargestellte Primäraktion haben.
- **FR-019**: Primäraktionen MUST NOT wegen leerer oder ungültiger Eingaben gesperrt sein;
  Fehler MUST beim Absenden am jeweiligen Feld gemeldet werden, und der Fokus MUST auf das
  erste fehlerhafte Feld springen. Die Regel gilt für Eingabeformulare; die Stimmabgabe auf der
  Abstimmungsseite behält ihr Verhalten aus Spec 004/005 („Stimme abgeben“ ist nur auslösbar,
  wenn eine von der aktuellen Stimme abweichende Option markiert ist).
- **FR-020**: Während des Absendens MUST die Primäraktion gesperrt sein und einen
  Ladezustand zeigen.
- **FR-021**: Auswahlkreise und Optionstext MUST durch einen sichtbaren Abstand getrennt sein.

**Begriffe und gefährliche Aktionen (US5)**

- **FR-022**: Die Beschriftungen „Soft löschen“, „Permanent löschen“, „Vorlagen filtern
  (Glob)“, „Lebenszyklus“ und „Stimmabgabezeitpunkt (UTC)“ MUST durch die in User Story 5
  genannten Begriffe ersetzt werden, in Deutsch und Englisch, einschließlich der
  zugehörigen Bestätigungstexte.
- **FR-023**: Zeitpunkte im persönlichen Profil MUST in lokaler Zeit im allgemeinen
  Datumsformat der Anwendung erscheinen.
- **FR-024**: Gefährliche Aktionen MUST am Ende ihrer Aktionsgruppe räumlich abgesetzt und
  nicht allein durch Farbe unterscheidbar sein.
- **FR-025**: Bestätigungen gefährlicher Aktionen MUST das betroffene Objekt benennen; die
  zweistufige Bestätigung für endgültiges Löschen MUST erhalten bleiben.

**User-Seiten (US6)**

- **FR-026**: Die Startseite ohne aktive Abstimmung MUST die Überschrift vor der Erklärung
  zeigen und „Alle Abstimmungen anzeigen“ genau einmal anbieten.
- **FR-027**: Jedes Datum auf Abstimmungskarten MUST eine Bezeichnung tragen.
- **FR-028**: Auf der Ergebnisseite MUST der Optionsname als Text erscheinen; Optionen mit
  Stimmen MUST eine beschriftete Aktion „Stimmen ansehen“ zur Optionsseite bieten.
- **FR-029**: Beschriftungen von Kennzahl-Kacheln MUST mindestens 14 px groß sein.

**Querschnitt**

- **FR-030**: Alle neuen und geänderten sichtbaren Texte MUST in den bestehenden
  Übersetzungsressourcen in Deutsch und Englisch vorliegen.
- **FR-031**: Alle geänderten Seiten MUST bei 375 px und 1280 px Breite ohne horizontales
  Scrollen bedienbar sein und sichtbare Fokuszustände behalten.
- **FR-032**: Karten MUST höchstens eine Verschachtelungsebene haben; Unterabschnitte
  innerhalb einer Karte werden durch Überschriften und Trennlinien gegliedert.
- **FR-033**: Bestehende Funktionen, Statusregeln und Berechtigungen MUST unverändert
  bleiben; diese Spec ändert ausschließlich Darstellung, Anordnung und Beschriftung.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In allen sechs Administrationsbereichen nennt die Seitenüberschrift den
  Bereich; null Seiten zeigen „Administration“ als Seitenüberschrift.
- **SC-002**: Bei einer abgelaufenen Abstimmung mit 25 Optionen ist die Aktion „Ergebnisse
  ansehen“ ohne Scrollen sichtbar, bei 1280×860 px und bei 375×812 px.
- **SC-003**: Mit drei Abstimmungen in unterschiedlichen Zuständen sind alle drei in der
  Administrationsliste ohne Scrollen bei 1280×860 px sichtbar; die Seitenhöhe sinkt
  gegenüber heute (rund 2800 px) um mindestens 60 %.
- **SC-004**: Ein Administrator findet und öffnet in einer Liste mit zehn Abstimmungen eine
  bestimmte Abstimmung und führt eine Aktion in unter 20 Sekunden aus.
- **SC-005**: 100 % der Eingabefelder haben ein sichtbares, verknüpftes Label; ein
  automatischer Barrierefreiheitstest meldet auf allen geprüften Seiten keine fehlenden
  Labels und keine Kontrastverstöße unter 4,5:1 für Text.
- **SC-006**: Keiner der Begriffe „Soft löschen“, „Permanent löschen“, „Glob“,
  „Lebenszyklus“, „UTC“ und „Anmeldung und Verwaltung“ erscheint mehr in der deutschen
  Oberfläche; Entsprechendes gilt für die englischen Pendants.
- **SC-007**: Jede gefährliche Aktion nennt in ihrer Bestätigung das betroffene Objekt;
  geprüft für Abstimmungen, Stimmen, Konten, Optionsvorlagen und Vorlagengruppen.
- **SC-008**: Alle bestehenden Frontend- und End-to-End-Prüfungen bleiben nach Anpassung
  der geänderten Beschriftungen erfolgreich.

## Assumptions

- Die Spec deckt die Befunde der Design-Kritik vom 2026-11-01 vollständig ab. Der Dark Mode
  wurde dort nicht geprüft und ist nicht Teil dieser Spec.
- Die Änderungen betreffen ausschließlich das Frontend; HTTP-Vertrag, Domänenregeln und
  Datenbestand bleiben unverändert. Benötigt eine Anzeige (z. B. Stimmenzahl je Abstimmung in
  der Administrationsliste) Daten, die das Frontend heute nicht hat, wird dies in der Planung
  geklärt; bevorzugt werden vorhandene Daten genutzt.
- Archivierte Abstimmungen sind für User nur dann erreichbar, wenn sie es heute schon sind;
  die Spec ändert die Sichtbarkeit nicht.
- Die Liste der Administrations-Abstimmungen wird aufgeklappt statt auf eine eigene
  Detailseite verlagert, damit keine neuen Seiten oder Adressen entstehen.
- „Löschen“ bezeichnet weiterhin den wiederherstellbaren Zustand `deleted` des
  Poll-Lebenszyklus; „Endgültig löschen“ entfernt die Abstimmung dauerhaft. Begriffe aus
  `CONTEXT.md` werden nicht ersetzt.
- Die bestehenden Bestätigungsabfragen bleiben in ihrer Art erhalten; nur ihr Text nennt
  künftig das betroffene Objekt.
- Die Grenze von zehn sofort sichtbaren Optionen in der Administrationsliste ist ein
  begründeter Standardwert und kann in der Planung angepasst werden.
- Die Mindestgröße von 14 px gilt für Kachelbeschriftungen; Metadaten-Zeilen bleiben bei
  ihrer heutigen Größe, sofern sie den Kontrast erfüllen.
