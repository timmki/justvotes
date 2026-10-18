# Feature Specification: Frontend UX Refinement

**Feature Branch**: `004-frontend-ux-refinement`

**Created**: 2026-10-18

**Status**: Draft

**Input**: User description: "Refinement pass for the frontend UX based on design-handoff.md
(follow-up to specs/003-frontend-ux-refactor): implement every item marked [change]" —
Grundlage ist `design-handoff.md`, das Ergebnis einer zweiten Design-Kritik von App-Rahmen,
Startseite und Abstimmungsseite nach Umsetzung von Spec 003 (Desktop 1024×768 und 375×812px,
ohne gesetzte Identität, eine aktive öffentliche Abstimmung).

## Clarifications

### Session 2026-10-18

- Q: Soll die Auswahl einer Option weiterhin sofort abstimmen oder eine ausdrückliche Bestätigung erfordern? → A: Ausdrückliche Bestätigung: Die Auswahl markiert nur eine Option; die Schaltfläche „Stimme abgeben“ sendet die Stimme, mit Ladezustand und Schutz vor doppeltem Absenden.
- Q: Gilt die Umstellung auf benannte Gestaltungswerte für das gesamte Frontend oder nur für App-Rahmen, Start-, Listen- und Abstimmungsseite? → A: Farbwerte (Akzent, Fokus, Auswahlkreise, Ladeanzeigen) im gesamten Frontend einschließlich Administrationsseiten; Abstands-, Radius- und Schriftskalen nur auf App-Rahmen, Start-, Listen- und Abstimmungsseite.
- Q: Zeigt das mobile Menü auf der Startseite ohne Identität die Identitätsaktion oder nur den Status? → A: Das Menü zeigt die Identitätsaktion immer, auch auf der Startseite; die abweichende Regel aus Spec 003 entfällt.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Eindeutige Identitätsaktion und klarer Sperrzustand (Priority: P1)

Eine Person ohne Identität sieht überall dieselbe Aktion „Identität festlegen“ – auf der
Startseite, im Hinweis der Abstimmungsseite, in der Seitenleiste und im mobilen Menü. Ist bereits
eine Identität gesetzt, heißt die Aktion überall „Identität ändern“. Auf einer aktiven Abstimmung
ohne Identität sind die Optionen deutlich als nicht verfügbar erkennbar, auch auf
Touch-Geräten, und Screenreader nennen den Grund. Nach dem Festlegen der Identität wird die
Person per Ansage informiert und landet mit dem Fokus direkt bei den Optionen.

**Why this priority**: Das Festlegen der Identität und die Stimmabgabe sind der Kernablauf.
Drei verschiedene Bezeichnungen für dieselbe Aktion und kaum erkennbar gesperrte Optionen
verunsichern genau an dieser Stelle.

**Independent Test**: Ohne Identität Start- und Abstimmungsseite sowie Seitenleiste und
mobiles Menü prüfen (Bezeichnung, Sperrzustand, Screenreader-Beschreibung), dann die Identität
auf der Abstimmungsseite festlegen und prüfen, wohin der Fokus springt und was angesagt wird.

**Acceptance Scenarios**:

1. **Given** keine Identität ist gesetzt, **When** Startseite, Abstimmungsseite, Seitenleiste
   oder mobiles Menü angezeigt werden, **Then** lautet die Identitätsaktion überall
   „Identität festlegen“ (Englisch: „Set identity“).
2. **Given** eine Identität ist gesetzt, **When** dieselben Stellen angezeigt werden,
   **Then** lautet die Aktion überall „Identität ändern“ (Englisch: „Change identity“), und
   „Identität bearbeiten“ kommt nirgends mehr vor.
3. **Given** keine Identität ist gesetzt und die Abstimmung ist aktiv, **When** die Optionen
   angezeigt werden, **Then** sind sie gegenüber dem auswählbaren Zustand deutlich
   abgeschwächt dargestellt (gedämpfte Schrift, reduzierte Deckkraft), ohne dass ein
   Mauszeiger nötig ist, um den Zustand zu erkennen.
4. **Given** keine Identität ist gesetzt, **When** ein Screenreader die Optionen erreicht,
   **Then** wird neben dem Status „nicht verfügbar“ auch der Hinweistext genannt, der erklärt,
   dass zuerst eine Identität festgelegt werden muss.
5. **Given** der Identitätsdialog ist auf der Abstimmungsseite geöffnet, **When** die
   Identität erfolgreich gespeichert wird, **Then** schließt der Dialog, der Hinweis
   verschwindet, der Fokus liegt auf der ersten Option und es wird höflich (nicht
   unterbrechend) angesagt: „Identität gesetzt. Du kannst jetzt abstimmen.“
6. **Given** der Identitätsdialog ist geöffnet, **When** er mit Escape oder „Abbrechen“
   geschlossen wird, **Then** kehrt der Fokus zur auslösenden Aktion zurück.
7. **Given** eine Identität ist gesetzt und die Abstimmung ist aktiv, **When** die Person
   Optionen per Maus, Touch oder Pfeiltasten auswählt, **Then** wird nur die Auswahl markiert
   und keine Stimme gesendet; erst „Stimme abgeben“ sendet die Stimme.
8. **Given** die markierte Option entspricht bereits der aktuellen Stimme oder es ist keine
   Option markiert, **When** die Schaltfläche „Stimme abgeben“ angezeigt wird, **Then** ist sie
   nicht auslösbar.

---

### User Story 2 - Abstimmungsfakten direkt unter dem Titel (Priority: P1)

Wer eine Abstimmung öffnet, sieht direkt unter dem Titel in einer Zeile die wichtigsten
Fakten: Status, Enddatum und Stimmenzahl (z. B. „aktiv · Endet am 31.10.2026 · 1 Stimme“).
Die nichtssagende Unterzeile „Abstimmungs-Details und Optionen.“ und das doppelte
Erstelldatum in der Abstimmungskarte entfallen.

**Why this priority**: Auf dem Handy erscheinen Status und Datum heute erst unterhalb des
Identitätshinweises. Wer über einen geteilten Link kommt, soll sofort sehen, ob und bis wann
abgestimmt werden kann.

**Independent Test**: Eine aktive Abstimmung bei 375px und 1024px öffnen und prüfen, dass
Status, Enddatum und Stimmenzahl ohne Scrollen direkt unter dem Titel stehen und weder die
Unterzeile noch ein zweites Erstelldatum in der Abstimmungskarte erscheint.

**Acceptance Scenarios**:

1. **Given** eine aktive Abstimmung mit Enddatum, **When** die Abstimmungsseite geöffnet
   wird, **Then** steht direkt unter dem Titel eine Faktenzeile mit Statuskennzeichnung,
   „Endet am <Datum>“ und Stimmenzahl in korrekter Einzahl/Mehrzahl.
2. **Given** die Abstimmungsseite wird angezeigt, **When** die Abstimmungskarte betrachtet
   wird, **Then** enthält sie weder Erstelldatum noch Statuskennzeichnung; das Erstelldatum
   steht nur noch in den Metadaten unter „Erstellt“.
3. **Given** die Abstimmungsseite wird angezeigt, **When** der Bereich unter dem Titel
   betrachtet wird, **Then** erscheint die Unterzeile „Abstimmungs-Details und Optionen.“
   nicht mehr.
4. **Given** 375×812px und keine Identität, **When** die Abstimmungsseite geöffnet wird,
   **Then** sind Titel, Faktenzeile und Identitätshinweis ohne Scrollen sichtbar.

---

### User Story 3 - Aufgeräumtes mobiles Menü und Layout (Priority: P2)

Auf dem Handy öffnet das Menü über einem abgedunkelten Hintergrund. Die Seite dahinter
scrollt nicht mit, ein Tippen auf den Hintergrund schließt das Menü, und alle Einträge im
Menü haben denselben seitlichen Abstand. Die Kennzahlen auf der Startseite sind bei 375px
gut lesbar, ohne dass Beschriftungen auf drei Zeilen umbrechen.

**Why this priority**: Das Menü funktioniert bereits; ohne Hintergrund und Scrollsperre ist
aber unklar, wie man es schließt, und die Kennzahlen wirken bei 375px gequetscht.

**Independent Test**: Bei 375×812px das Menü öffnen, Hintergrund, Scrollsperre, Abstände,
Schließen per Hintergrund/Escape/Navigation und Fokusrückgabe prüfen; anschließend die
Kennzahlen der Startseite betrachten.

**Acceptance Scenarios**:

1. **Given** schmale Bildschirmbreite, **When** das Menü geöffnet wird, **Then** liegt
   unter dem Menü ein abgedunkelter Hintergrund und die Seite dahinter lässt sich nicht
   scrollen.
2. **Given** das Menü ist geöffnet, **When** die Person auf den Hintergrund tippt, Escape
   drückt, die Schließen-Schaltfläche oder einen Navigationseintrag wählt, **Then** schließt
   das Menü, die Seite ist wieder scrollbar und der Fokus liegt auf der Menü-Schaltfläche
   (bei Navigation: auf der neuen Seite).
3. **Given** das Menü ist geöffnet, **When** die Person mit Tab navigiert, **Then** bleibt
   der Fokus innerhalb von Menü und Menü-Schaltfläche.
4. **Given** das Menü ist geöffnet, **When** Navigationseinträge und Identitätsbereich
   betrachtet werden, **Then** haben sie denselben seitlichen Abstand zum Rand.
5. **Given** 375px Breite, **When** die Kennzahlen der Startseite angezeigt werden,
   **Then** steht jede Kennzahl in einer eigenen Zeile mit Beschriftung und Wert
   nebeneinander, und keine Beschriftung bricht auf mehr als zwei Zeilen um.

---

### User Story 4 - Einheitliches Erscheinungsbild in allen Themes (Priority: P2)

Primäre Schaltflächen, Fokusrahmen, Auswahlkreise und Ladeanzeigen nutzen in allen vier
Themes (Hell, Dunkel, Sepia, Eco) dieselbe Akzentfarbe wie Links des jeweiligen Themes, mit
ausreichendem Kontrast. Abstände, Eckenradien und Schriftgrößen folgen einer festen, benannten
Skala statt Einzelwerten. Filterauswahlen und „Filter zurücksetzen“ sind gleich hoch.

**Why this priority**: Heute ist ein helles Blau an vielen Stellen fest eingetragen und
folgt dem Theme nicht; die primäre Schaltfläche nutzt schwarze Schrift und weicht von der
Linkfarbe ab. Ein fester Satz an Gestaltungswerten verhindert neue Abweichungen.

**Independent Test**: Start-, Listen- und Abstimmungsseite in allen vier Themes öffnen und
Farbe und Kontrast von primärer Schaltfläche, Fokusrahmen, Auswahlkreisen und Ladeanzeige
messen; die Höhe der Filterelemente vergleichen.

**Acceptance Scenarios**:

1. **Given** ein beliebiges der vier Themes, **When** eine primäre Schaltfläche angezeigt
   wird, **Then** nutzt sie die Akzentfarbe des Themes als Füllung, die Schrift hat dazu
   einen Kontrast von mindestens 4,5:1 und der Farbton entspricht dem der Links.
2. **Given** ein beliebiges Theme, **When** ein Element per Tastatur fokussiert wird,
   **Then** ist der Fokusrahmen in der Akzentfarbe des Themes und hat mindestens 3:1 Kontrast
   zum Hintergrund.
3. **Given** ein beliebiges Theme, **When** Auswahlkreise und Ladeanzeigen erscheinen,
   **Then** nutzen sie die Akzentfarbe des Themes und keine fest eingetragene Farbe.
4. **Given** die primäre Schaltfläche, **When** der Mauszeiger darauf liegt, **Then** wird
   die Füllung sichtbar dunkler; **When** eine ausgelöste Aktion läuft, **Then** zeigt die
   Schaltfläche eine Ladeanzeige neben der unveränderten Beschriftung, ist gesperrt und als
   beschäftigt gekennzeichnet.
5. **Given** die Abstimmungsliste, **When** die Filterleiste angezeigt wird, **Then**
   haben Sortierung, Datumsauswahl und „Filter zurücksetzen“ dieselbe Höhe (mind. 44px)
   und denselben Eckenradius.

---

### User Story 5 - Saubere Abstände, Umbrüche und Bewegung (Priority: P3)

Die Startseite beginnt ohne leeren Streifen über der Identitätskarte. In der Seitenleiste
bricht der Identitätsstatus um, statt abgeschnitten zu werden. Lange Titel und
Optionsbezeichnungen brechen sauber um. Menü, Schaltflächen und das Verschwinden des
Identitätshinweises sind dezent animiert, und bei reduzierter Bewegung entfällt die Animation.

**Why this priority**: Diese Punkte wirken wie Fehler (leerer Streifen, „Noch keine
Identität …“), blockieren den Ablauf aber nicht.

**Independent Test**: Startseite und Seitenleiste bei 1024px betrachten, eine Abstimmung mit
sehr langem Titel und langen Optionsnamen anlegen und anzeigen, dann mit und ohne Einstellung
„Bewegung reduzieren“ Menü und Schaltflächen bedienen.

**Acceptance Scenarios**:

1. **Given** die Startseite, **When** sie geöffnet wird, **Then** beginnt die
   Identitätskarte direkt mit dem regulären Seitenabstand unter der Kopfzeile, ohne
   zusätzlichen leeren Bereich; die Hauptüberschrift bleibt für Screenreader erhalten.
2. **Given** keine Identität und Desktop-Breite, **When** die Seitenleiste angezeigt wird,
   **Then** steht „Noch keine Identität gesetzt“ vollständig (umbrochen), und die Aktion ist
   bündig mit dem Text ausgerichtet.
3. **Given** ein Abstimmungstitel mit über 120 Zeichen, **When** er als Hauptüberschrift
   erscheint, **Then** bricht er vollständig um; **When** er auf einer Abstimmungskarte
   erscheint, **Then** wird er nach drei Zeilen gekürzt, und der vollständige Titel bleibt
   der zugängliche Name der Karte.
4. **Given** eine Optionsbezeichnung über mehrere Zeilen, **When** sie angezeigt wird,
   **Then** bricht sie vollständig um und der Auswahlkreis steht auf Höhe der ersten Zeile.
5. **Given** keine Einstellung „Bewegung reduzieren“, **When** Menü geöffnet/geschlossen,
   eine Schaltfläche gedrückt oder der Identitätshinweis entfernt wird, **Then** erfolgt der
   Übergang animiert in höchstens 200ms.
6. **Given** die Einstellung „Bewegung reduzieren“ ist aktiv, **When** dieselben Aktionen
   ausgeführt werden, **Then** erfolgen die Wechsel ohne sichtbare Animation.

---

### Edge Cases

- Die Identität wird im Dialog auf einen Wert gesetzt, der in dieser Abstimmung bereits eine
  Stimme hat: der Fokus landet auf der aktuell gewählten Option statt auf der ersten.
- Das Festlegen der Identität schlägt fehl: es erfolgt keine Erfolgsansage, der Fokus bleibt
  im Dialog bei der Fehlermeldung, die Optionen bleiben gesperrt.
- Die Abstimmung ist nicht aktiv: kein Identitätshinweis und keine Verknüpfung der Optionen mit
  einem Hinweistext; die Faktenzeile zeigt den tatsächlichen Status.
- Die Abstimmung hat kein Enddatum: die Faktenzeile lässt „Endet am“ weg, ohne doppelte
  Trennzeichen.
- Null Stimmen: die Faktenzeile zeigt „0 Stimmen“.
- Das Menü ist geöffnet und das Fenster wird auf Desktop-Breite vergrößert: das Menü
  schließt, Hintergrund und Scrollsperre werden aufgehoben.
- Englische Texte sind bis zu ~30 % länger: Schaltflächen wachsen in der Breite und brechen
  erst unter 320px Breite um; bei 320px gibt es kein horizontales Scrollen.
- Langsame Verbindung beim Speichern der Identität oder bei „Stimme abgeben“: die auslösende
  Schaltfläche bleibt bis zur Antwort im Ladezustand, die Optionen sind währenddessen nicht
  änderbar; doppeltes Absenden ist nicht möglich.
- Das Senden der Stimme schlägt fehl: die markierte Option bleibt markiert, eine Fehlermeldung
  wird angesagt und „Stimme abgeben“ ist erneut auslösbar.
- Eine Person markiert eine Option und verlässt die Seite ohne „Stimme abgeben“: es wird keine
  Stimme gesendet; die Markierung geht verloren.

## Requirements *(mandatory)*

### Functional Requirements

**Identitätsaktion und Sperrzustand**

- **FR-001**: Die Identitätsaktion MUST überall (Startseite, Hinweis der Abstimmungsseite,
  Seitenleiste, mobiles Menü) ohne Identität „Identität festlegen“ und mit Identität
  „Identität ändern“ heißen, in allen unterstützten Sprachen; die Bezeichnung
  „Identität bearbeiten“ MUST entfallen. Das mobile Menü MUST die Identitätsaktion auf jeder
  Seite zeigen, auch auf der Startseite ohne Identität.
- **FR-002**: Gesperrte Optionen MUST ohne Mauszeiger und ohne Farbwahrnehmung allein als
  nicht verfügbar erkennbar sein (deutlich reduzierte Deckkraft und gedämpfte Schrift
  gegenüber dem auswählbaren Zustand).
- **FR-003**: Gesperrte Optionen MUST für assistive Technologien mit dem Hinweistext
  verknüpft sein, der den Grund der Sperre nennt.
- **FR-004**: Nach erfolgreichem Festlegen der Identität auf der Abstimmungsseite MUST der
  Fokus auf die erste Option (bzw. die aktuell gewählte Option) gesetzt und eine höfliche
  Statusansage „Identität gesetzt. Du kannst jetzt abstimmen.“ ausgegeben werden.
- **FR-005**: Beim Abbrechen des Identitätsdialogs MUST der Fokus zur auslösenden Aktion
  zurückkehren; beim Öffnen MUST der Fokus im Eingabefeld liegen.

**Abstimmungsseite**

- **FR-006**: Die Abstimmungsseite MUST direkt unter dem Titel eine Faktenzeile mit
  Statuskennzeichnung, Enddatum („Endet am …“, falls vorhanden) und Stimmenzahl zeigen.
- **FR-007**: Die Unterzeile „Abstimmungs-Details und Optionen.“ MUST entfallen.
- **FR-008**: Die Abstimmungskarte MUST weder Erstelldatum noch Statuskennzeichnung
  enthalten; das Erstelldatum MUST nur in den Metadaten erscheinen.
- **FR-031**: Das Auswählen einer Option (Maus, Touch, Pfeiltasten, Leertaste) MUST nur die
  Auswahl markieren und keine Stimme senden. Eine Schaltfläche „Stimme abgeben“ unterhalb der
  Optionen MUST die Stimme senden; sie MUST nur auslösbar sein, wenn eine Option markiert ist,
  die von der aktuellen Stimme abweicht. Während des Sendens gelten FR-021 und FR-022.

**Startseite und Seitenleiste**

- **FR-009**: Die Startseite MUST ohne zusätzlichen leeren Bereich über der ersten Karte
  beginnen; die nur für Screenreader sichtbare Hauptüberschrift MUST erhalten bleiben.
- **FR-010**: Bei weniger als 640px Breite MUST jede Kennzahl der Startseite eine eigene
  Zeile mit Beschriftung und Wert nebeneinander belegen.
- **FR-011**: Der Identitätsstatus in der Seitenleiste MUST umbrechen statt gekürzt zu
  werden; die Aktion MUST bündig mit dem Statustext stehen.

**Mobiles Menü**

- **FR-012**: Das geöffnete mobile Menü MUST über einem abgedunkelten Hintergrund liegen,
  der bei Antippen das Menü schließt.
- **FR-013**: Solange das Menü geöffnet ist, MUST die Seite dahinter nicht scrollbar sein.
- **FR-014**: Das Menü MUST über Schließen-Schaltfläche, Escape, Hintergrund und Wahl eines
  Navigationseintrags schließbar sein; außer bei Navigation MUST der Fokus danach auf der
  Menü-Schaltfläche liegen.
- **FR-015**: Solange das Menü geöffnet ist, MUST der Tastaturfokus innerhalb von Menü und
  Menü-Schaltfläche bleiben.
- **FR-016**: Navigationseinträge und Identitätsbereich im Menü MUST denselben seitlichen
  Abstand haben.
- **FR-017**: Beim Wechsel auf Desktop-Breite MUST ein geöffnetes Menü schließen und die
  Scrollsperre aufheben.

**Erscheinungsbild und Bedienelemente**

- **FR-018**: Es MUST einen zentralen, benannten und je Theme definierten Satz von
  Gestaltungswerten geben. Farben für Akzent, Fokus, Auswahlkreise und Ladeanzeigen MUST im
  gesamten Frontend einschließlich der Administrationsseiten daraus stammen; fest eingetragene
  Farbwerte dafür MUST entfallen. Abstände, Eckenradien und Schriftgrößen MUST auf App-Rahmen,
  Start-, Listen- und Abstimmungsseite daraus stammen; andere Seiten behalten ihre bisherigen
  Abstände und Größen.
- **FR-019**: Primäre Schaltflächen MUST in jedem Theme die Akzentfarbe der Links als
  Füllung nutzen, und die Schrift darauf MUST mindestens 4,5:1 Kontrast haben.
- **FR-020**: Fokusrahmen MUST in jedem Theme die Akzentfarbe nutzen und mindestens 3:1
  Kontrast zum angrenzenden Hintergrund haben.
- **FR-021**: Primäre Schaltflächen MUST einen sichtbaren Hover-Zustand (dunklere Füllung)
  und einen Ladezustand haben (Ladeanzeige neben unveränderter Beschriftung, gesperrt, für
  assistive Technologien als beschäftigt gekennzeichnet).
- **FR-022**: Während eine ausgelöste Aktion läuft, MUST erneutes Auslösen derselben Aktion
  verhindert werden.
- **FR-023**: Sortierung, Datumsauswahl und „Filter zurücksetzen“ MUST dieselbe Höhe
  (mindestens 44px) und denselben Eckenradius haben.

**Umbrüche und Bewegung**

- **FR-024**: Abstimmungstitel als Hauptüberschrift MUST nie gekürzt werden; auf
  Abstimmungskarten MUST ein Titel nach drei Zeilen gekürzt werden, wobei der vollständige
  Titel der zugängliche Name bleibt.
- **FR-025**: Optionsbezeichnungen MUST vollständig umbrechen; der Auswahlkreis MUST auf
  Höhe der ersten Textzeile stehen.
- **FR-026**: Öffnen/Schließen des Menüs, Drücken von Schaltflächen und das Entfernen des
  Identitätshinweises MUST mit Übergängen von höchstens 200ms erfolgen.
- **FR-027**: Bei aktivierter Systemeinstellung „Bewegung reduzieren“ MUST jede dieser
  Animationen entfallen.

**Querschnitt**

- **FR-028**: Alle neuen oder geänderten Texte MUST in allen unterstützten Sprachen gepflegt
  sein und der Terminologie aus `CONTEXT.md` folgen.
- **FR-029**: Alle Änderungen MUST in allen vier Themes und bei 320, 375, 768 und 1024px
  Breite ohne horizontales Scrollen funktionieren.
- **FR-030**: Der bestehende HTTP-Vertrag MUST unverändert bleiben.

### Key Entities

- **Gestaltungswerte**: Benannter, je Theme definierter Satz aus Farben (Akzent,
  Fokus, primäre Schaltfläche, Text, Flächen), Abständen, Eckenradien und Schriftstufen.
- **Faktenzeile**: Kurzzusammenfassung einer Abstimmung aus Poll-Lebenszyklusstatus,
  Enddatum und Stimmenzahl.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Auf Start-, Listen- und Abstimmungsseite sowie in Seitenleiste und mobilem Menü
  gibt es für die Identitätsaktion je Zustand genau eine Bezeichnung (0 Abweichungen).
- **SC-002**: Ein automatischer Browser-Test misst in allen vier Themes für die Schrift
  primärer Schaltflächen mindestens 4,5:1 und für Fokusrahmen mindestens 3:1 Kontrast.
- **SC-003**: Bei 375×812px sind auf der Abstimmungsseite ohne Identität Titel, Status,
  Enddatum, Stimmenzahl und die Aktion „Identität festlegen“ ohne Scrollen sichtbar.
- **SC-004**: Eine Person ohne Identität kann per Tastatur allein die Identität auf der
  Abstimmungsseite festlegen, ohne zusätzlichen Tab-Schritt die erste Option erreichen und mit
  „Stimme abgeben“ abstimmen; das Durchlaufen aller Optionen mit den Pfeiltasten erzeugt
  0 Stimmen.
- **SC-005**: In einer Screenreader-Prüfung wird beim Erreichen gesperrter Optionen der Grund
  der Sperre vorgelesen, und nach dem Festlegen der Identität erfolgt genau eine Erfolgsansage.
- **SC-006**: Bei 375px Breite bricht keine Kennzahl-Beschriftung der Startseite auf mehr als
  zwei Zeilen um, und kein Text auf den drei Seiten ist abgeschnitten (außer Kartentitel über
  drei Zeilen).
- **SC-007**: Bei geöffnetem mobilem Menü verändert Scrollen die Position der Seite dahinter
  nicht, und alle vier Schließwege funktionieren in 100 % der Testläufe.
- **SC-008**: In allen vier Themes erscheinen primäre Schaltflächen, Fokusrahmen,
  Auswahlkreise und Ladeanzeigen auf allen Seiten, einschließlich der Administrationsseiten,
  im Akzentton des jeweiligen Themes (0 Elemente in einer themeunabhängigen Farbe).
- **SC-009**: Mit aktivierter Einstellung „Bewegung reduzieren“ ist keine Animation länger als
  0,1 Sekunden.

## Assumptions

- `design-handoff.md` ist die maßgebliche Vorlage für Maße, Werte und Animationen; diese
  Spezifikation beschreibt nur das gewünschte Verhalten und die prüfbaren Ergebnisse.
- Die Vorgaben aus Spec 003, das mobile Menü zeige „Identität bearbeiten“ und auf der
  Startseite ohne Identität nur den Status, werden durch FR-001 ersetzt; alle übrigen
  Ergebnisse von Spec 003 bleiben gültig.
- Für die Kennzahlen bei schmaler Breite wird die einspaltige Darstellung mit Beschriftung und
  Wert nebeneinander gewählt; kürzere Beschriftungen sind nicht Teil des Umfangs.
- Der Akzentton der Links (bisher „Akzent-Text“) wird als Füllung primärer Schaltflächen
  verwendet, weil die hellere Akzentfüllung in Sepia (~3,7:1) und Eco (~3,2:1) mit heller
  Schrift den Mindestkontrast verfehlt; Sepia ist bei der Umsetzung nachzumessen.
- Gesperrte Optionen bleiben über ein gesperrtes Formularfeld nicht auswählbar; nur Darstellung
  und Verknüpfung mit dem Hinweistext ändern sich.
- Administrationsseiten sind nur über die Farbumstellung (FR-018) sowie gemeinsame
  Bedienelemente und Texte betroffen; ihr Layout bleibt unverändert.
- Eine dauerhaft sichtbare Zusammenfassung „Stimme abgeben“ bei sehr vielen Optionen ist nicht
  Teil dieses Umfangs.
- Bestehende Unit-, Komponenten- und Browser-Tests, die Bezeichnungen oder Layout prüfen,
  werden an das geänderte Verhalten angepasst.
