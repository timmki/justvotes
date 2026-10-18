# Feature Specification: Frontend UX Refactoring

**Feature Branch**: `003-frontend-ux-refactor`

**Created**: 2026-10-18

**Status**: Draft

**Input**: User description: "Arbeite eine Umsetzung des Plans aus der Datei aus" (Plan: `refactor-frontend.md`,
Ergebnis einer Design-Kritik von Startseite, Abstimmungsliste und Abstimmungsseite auf Desktop und
375px Mobilbreite, ohne gesetzte Identität, mit einer aktiven öffentlichen Abstimmung)

## Clarifications

### Session 2026-10-18

- Q: Soll die korrekte Stimmenzahl auch auf Ergebnis- und Optionsseiten gelten? → A: Ja, überall, wo eine Stimmenzahl angezeigt wird, inklusive Ergebnis- und Optionsseiten (Admin-Seiten nicht).
- Q: Wie wird die Identität im mobilen Menü bearbeitet? → A: Das Menü zeigt nur den Identitätsstatus; „Identität bearbeiten“ schließt das Menü und öffnet den bestehenden Identitätseditor in einem eigenen Dialog. Auf der Startseite ohne Identität zeigt das Menü nur den Status ohne Aktion, weil die Identitätskarte dort bereits sichtbar ist.
- Q: Wie wird der Kontrast der Auswahlkreise (≥ 3:1) geprüft? → A: Ein automatischer Browser-Test berechnet den Kontrast aus den tatsächlichen Rand- und Hintergrundfarben in allen vier Themes; die automatisierte Barrierefreiheitsprüfung deckt nur noch Landmark-Namen, Linknamen und Textkontrast ab.
- Q: Woran ist erkennbar, dass der Metadatenbereich leichter wirkt? → A: Keine eigene Hintergrundfläche (Seitenhintergrund), kein Schatten, höchstens eine dezente Trennlinie.
- Q: Wird „Audit“ in allen deutschen Texten durch „Prüfprotokoll“ ersetzt? → A: Ja, in allen deutschen Texten einschließlich Admin-Dialog und „Audit-Kontext“.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Identität setzen und direkt abstimmen (Priority: P1)

Eine Person ohne zugewiesene Identität öffnet eine aktive Abstimmung. Ganz oben in
der Abstimmungskarte erkennt sie, dass für die Stimmabgabe eine Identität nötig
ist, und kann diese direkt an dieser Stelle setzen. Bis dahin sind die Optionen
sichtbar, aber erkennbar nicht auswählbar. Nach dem Setzen der Identität kann sie
ohne Seitenwechsel abstimmen. Auf der Startseite ist das Setzen der Identität die
hervorgehobene Hauptaktion, solange keine Identität gesetzt ist.

**Why this priority**: Die Stimmabgabe ist der Kernablauf der Anwendung. Heute
steht der Hinweis unter den Optionen und verweist auf die Startseite, sodass
Personen den Ablauf abbrechen.

**Independent Test**: Ohne gesetzte Identität eine aktive Abstimmung öffnen, die
Identität im Hinweis setzen und eine Stimme abgeben, ohne die Abstimmungsseite zu
verlassen.

**Acceptance Scenarios**:

1. **Given** keine Identität ist gesetzt, **When** eine aktive Abstimmung geöffnet
   wird, **Then** steht oberhalb der Optionen ein Hinweis mit einer Aktion zum
   Setzen der Identität, und es gibt keine Aufforderung, zur Startseite zu wechseln.
2. **Given** keine Identität ist gesetzt, **When** die Person die Optionen
   betrachtet oder per Tastatur erreicht, **Then** sind sie sichtbar und für
   assistive Technologien als nicht verfügbar gekennzeichnet, und eine Auswahl
   ist nicht möglich.
3. **Given** der Hinweis wird angezeigt, **When** die Person die Aktion auswählt
   und eine gültige Identität bestätigt, **Then** wird die Identität an Ort und
   Stelle gesetzt, der Hinweis verschwindet und die Optionen werden auswählbar.
4. **Given** keine Identität ist gesetzt, **When** die Startseite geöffnet wird,
   **Then** ist das Setzen der Identität die visuell hervorgehobene Hauptaktion.
5. **Given** die Person bricht das Setzen der Identität ab, **When** der Editor
   geschlossen wird, **Then** bleibt der Hinweis bestehen und der Fokus kehrt zur
   auslösenden Aktion zurück.

---

### User Story 2 - Vorhandene Abstimmungen in der Liste finden (Priority: P1)

Eine Person öffnet die Liste der öffentlichen Abstimmungen und sieht standardmäßig
alle öffentlichen Abstimmungen, unabhängig vom Erstellungsdatum. Datumsfilter
bleiben als optionale Einschränkung verfügbar. Liefert ein Filter keine Treffer,
benennt der Leerzustand den aktiven Filter und bietet an, ihn zurückzusetzen.

**Why this priority**: Der heutige Standardfilter „heute“ blendet vorhandene aktive
Abstimmungen aus und meldet „0 öffentliche Abstimmungen“, obwohl Abstimmungen
existieren.

**Independent Test**: Mit einer aktiven öffentlichen Abstimmung, die nicht heute
erstellt wurde, die Liste ohne Parameter öffnen; die Abstimmung ist sichtbar.
Danach einen Filter ohne Treffer wählen und über den Leerzustand zurücksetzen.

**Acceptance Scenarios**:

1. **Given** öffentliche Abstimmungen mit unterschiedlichen Erstellungsdaten,
   **When** die Liste ohne gewählten Filter geöffnet wird, **Then** werden alle
   öffentlichen Abstimmungen angezeigt und die Filterauswahl zeigt „Alle“.
2. **Given** ein Datumsfilter ist aktiv und liefert keine Treffer, **When** die
   Liste angezeigt wird, **Then** nennt der Leerzustand den aktiven Filter und
   bietet die Aktion „Filter zurücksetzen“ an.
3. **Given** der Leerzustand mit aktivem Filter, **When** die Person „Filter
   zurücksetzen“ auswählt, **Then** gilt wieder „Alle“ und die Abstimmungen
   werden angezeigt.
4. **Given** eine geteilte oder gespeicherte Listenadresse mit einem expliziten
   Datumsfilter, **When** sie geöffnet wird, **Then** bleibt dieser Filter aktiv.

---

### User Story 3 - Kompakte Navigation auf kleinen Bildschirmen (Priority: P1)

Auf einem schmalen Bildschirm (375px Breite) sieht die Person eine einzige
kompakte Kopfzeile mit Logo, Sprachauswahl, Theme-Auswahl und einer
Menüschaltfläche. Navigationseinträge und der Identitätsstatus sind über das Menü
erreichbar; Inhalte der Seite beginnen sofort sichtbar unterhalb der Kopfzeile.

**Why this priority**: Heute belegen drei gestapelte Leisten rund 520 von 812px
Höhe und schneiden „JustVotes“ sowie „Identität bearbeiten“ ab; der eigentliche
Inhalt ist auf Mobilgeräten kaum sichtbar.

**Independent Test**: Die Anwendung bei 375×812px öffnen; die Kopfzeile ist eine
Leiste ohne abgeschnittene Texte, und alle Navigationsziele sowie der
Identitätsstatus sind über das Menü erreichbar.

**Acceptance Scenarios**:

1. **Given** eine Bildschirmbreite von 375px, **When** eine beliebige öffentliche
   Seite geöffnet wird, **Then** gibt es genau eine Kopfzeile mit Logo,
   Sprachauswahl, Theme-Auswahl und Menüschaltfläche, und kein Text darin ist
   abgeschnitten.
2. **Given** das Menü ist geschlossen, **When** die Person die Menüschaltfläche
   auswählt, **Then** öffnet sich das Menü mit allen Navigationszielen und dem
   Identitätsstatus samt Aktion zum Bearbeiten.
5. **Given** das Menü ist geöffnet, **When** die Person „Identität bearbeiten“
   auswählt, **Then** schließt sich das Menü, der Identitätseditor öffnet sich
   in einem Dialog, und nach Bestätigung oder Abbruch ist der Vorgang
   abgeschlossen, ohne dass das Menü ihn unterbricht.
3. **Given** das Menü ist geöffnet, **When** die Person Escape drückt, ein Ziel
   auswählt oder außerhalb klickt, **Then** schließt sich das Menü und der Fokus
   wird sinnvoll gesetzt.
4. **Given** eine Desktop-Breite, **When** eine Seite geöffnet wird, **Then**
   bleibt die Navigation ohne Menüschaltfläche direkt sichtbar.

---

### User Story 4 - Klare Seitenhierarchie ohne Dopplungen (Priority: P2)

Die Person erkennt auf jeder Seite sofort, worum es geht: Die Abstimmungsseite
trägt den Titel der Abstimmung als Hauptüberschrift, die Startseite wiederholt den
Produktnamen nicht als große Überschrift, die Identitätskarte erscheint nur einmal,
die hervorgehobene Abstimmung wird in „Neueste öffentliche Abstimmungen“ nicht
erneut gelistet, und die Metadaten treten optisch hinter die Abstimmungskarte
zurück.

**Why this priority**: Doppelte Inhalte und generische Überschriften verwässern
die Hierarchie, sind aber für den Kernablauf nicht blockierend.

**Independent Test**: Start- und Abstimmungsseite auf Desktop öffnen und
Überschriftenstruktur, Anzahl der Identitätskarten und Abstimmungseinträge prüfen.

**Acceptance Scenarios**:

1. **Given** eine geöffnete Abstimmung, **When** die Überschriftenstruktur gelesen
   wird, **Then** ist der Abstimmungstitel die einzige Hauptüberschrift, und
   „Abstimmung“ erscheint nicht mehr als generische Überschrift im Metadatenbereich.
2. **Given** die Startseite auf Desktop ohne gesetzte Identität, **When** sie
   angezeigt wird, **Then** gibt es genau eine vollständige Identitätskarte.
3. **Given** eine gesetzte Identität, **When** die Startseite angezeigt wird,
   **Then** zeigt die Seitenleiste höchstens einen kompakten Identitätsstatus und
   keine zweite vollständige Identitätskarte.
4. **Given** eine hervorgehobene Abstimmung „Im Fokus“, **When** „Neueste
   öffentliche Abstimmungen“ angezeigt wird, **Then** ist sie dort nicht enthalten;
   bliebe der Abschnitt dadurch leer, wird er ausgeblendet.
5. **Given** eine geöffnete Abstimmung, **When** Abstimmungskarte und Metadaten
   nebeneinander erscheinen, **Then** hat der Metadatenbereich keine eigene
   Hintergrundfläche und keinen Schatten, höchstens eine dezente Trennlinie.

---

### User Story 5 - Einheitliche Status- und Bedienelemente (Priority: P3)

Status, Stimmenzahl, Links und Aktionen sehen überall gleich aus: Der Status
„aktiv“ und weitere Lebenszyklusstatus nutzen eine einheitliche Kennzeichnung,
die Stimmenzahl ist beschriftet („1 Stimme“), Navigationslinks und
Aktionsschaltflächen sind klar unterscheidbar, und die hervorgehobene Abstimmung
ist keine Karte in einer Karte.

**Why this priority**: Konsistenz verbessert Lesbarkeit und Vertrauen, ändert aber
keinen Ablauf.

**Independent Test**: Hervorgehobene Abstimmung, Listeneinträge und
Abstimmungsseite vergleichen; Statuskennzeichnung, Stimmenzahl sowie Link- und
Aktionsstil sind identisch.

**Acceptance Scenarios**:

1. **Given** Abstimmungen im Bereich „Im Fokus“, in der Liste und auf der
   Abstimmungsseite, **When** ihr Status angezeigt wird, **Then** hat dieselbe
   Statusart überall dieselbe Form und Farbe.
2. **Given** eine Abstimmung mit Stimmen, **When** die Stimmenzahl angezeigt wird,
   **Then** steht sie beschriftet (z. B. „1 Stimme“) und ist nicht als
   Benachrichtigungszähler gestaltet.
3. **Given** ein Element, das eine Aktion auslöst (z. B. „Identität bearbeiten“),
   **When** es angezeigt wird, **Then** ist es als Schaltfläche gestaltet;
   Elemente, die zu einer anderen Seite führen, sind als Link gestaltet.
4. **Given** die hervorgehobene Abstimmung, **When** sie angezeigt wird, **Then**
   liegt sie nicht als eigene Karte innerhalb einer weiteren Karte.

---

### User Story 6 - Verständliche Texte (Priority: P4)

Texte sind grammatikalisch korrekt und beschreiben, was angezeigt wird: Die
Stimmenzahl wird korrekt in Singular und Plural angezeigt, ein reines Enddatum
heißt „Endet am“, die Zeile „Optionsnummer n“ unter den Optionen entfällt und das
Prüfprotokoll trägt einen deutschen Titel. Alle Texte bleiben in allen
unterstützten Sprachen gepflegt.

**Why this priority**: Kleine Textfehler wirken unfertig, behindern aber keinen
Ablauf.

**Independent Test**: Abstimmungen mit 0, 1 und mehreren Stimmen sowie eine
Abstimmung mit Enddatum und Prüfprotokoll in jeder unterstützten Sprache prüfen.

**Acceptance Scenarios**:

1. **Given** eine Abstimmung mit genau einer Stimme, **When** die Stimmenzahl
   angezeigt wird, **Then** lautet sie „1 Stimme“; bei 0 oder mehreren „n Stimmen“.
2. **Given** eine Abstimmung mit Enddatum, **When** die Metadaten angezeigt
   werden, **Then** wird das Datum mit „Endet am“ beschriftet.
3. **Given** eine aktive Abstimmung, **When** die Optionen angezeigt werden,
   **Then** erscheint unter den Optionen keine Zeile „Optionsnummer n“.
4. **Given** die deutsche Sprache, **When** das Prüfprotokoll angezeigt wird,
   **Then** lautet sein Titel „Prüfprotokoll“.

---

### User Story 7 - Barrierefreie Bedienung (Priority: P5)

Personen mit Touch-Bedienung, eingeschränktem Sehvermögen oder Screenreader
können alle Elemente sicher treffen, lesen und eindeutig identifizieren.

**Why this priority**: Die Anwendung ist bereits grundlegend zugänglich; diese
Punkte schließen festgestellte Lücken.

**Independent Test**: Touch-Zielgrößen, Schriftgrößen, Kontrast der
Optionsindikatoren und Accessibility-Tree auf Start-, Listen- und
Abstimmungsseite prüfen.

**Acceptance Scenarios**:

1. **Given** die Links „Alle Abstimmungen anzeigen“ und „Admin“, **When** ihre
   Trefferfläche gemessen wird, **Then** ist sie mindestens 44×44px groß.
2. **Given** Überzeilen wie „Identität“ oder „Im Fokus“, **When** sie angezeigt
   werden, **Then** ist ihre Schriftgröße mindestens 12px.
3. **Given** die Auswahlindikatoren der Optionen, **When** sie in einem beliebigen
   Theme angezeigt werden, **Then** haben ihre Umrandungen einen Kontrast von
   mindestens 3:1 zum Hintergrund.
4. **Given** die Navigationsbereiche, **When** ein Screenreader die Landmarks
   auflistet, **Then** gibt es keine zwei sichtbar angebotenen Landmarks mit
   gleichem Namen; nicht aktive Navigationen sind vollständig verborgen.
5. **Given** eine Abstimmungskarte mit Link, **When** ein Screenreader den
   Linknamen vorliest, **Then** lautet er auf den Abstimmungstitel (optional
   ergänzt um den Status) statt einer zusammengeklebten Zeichenkette aller
   Karteninhalte.

---

### Edge Cases

- Die Identität wird im Inline-Editor auf der Abstimmungsseite auf einen Wert
  geändert, der bereits eine Stimme in dieser Abstimmung hat: die vorhandene
  Stimme wird nach dem Setzen als aktuelle Auswahl angezeigt.
- Das Setzen der Identität schlägt fehl (Validierung oder Netzwerk): die
  Fehlermeldung erscheint im Editor, die Optionen bleiben gesperrt.
- Die Abstimmung ist nicht aktiv (z. B. abgelaufen): es wird kein Identitätshinweis
  zur Stimmabgabe angezeigt, die Optionen sind wie bisher nicht auswählbar.
- Es gibt überhaupt keine öffentlichen Abstimmungen: der Leerzustand der Liste
  bietet bei „Alle“ kein „Filter zurücksetzen“ an.
- Eine Listenadresse enthält einen ungültigen Datumsfilter oder ein ungültiges
  Datumsintervall: es gilt „Alle“ bzw. der bestehende Hinweis auf ein ungültiges
  Intervall.
- Es gibt nur eine öffentliche Abstimmung, die zugleich „Im Fokus“ steht: der
  Abschnitt „Neueste öffentliche Abstimmungen“ entfällt.
- Sehr lange Abstimmungstitel als Hauptüberschrift oder in der mobilen Kopfzeile
  umbrechen, ohne horizontales Scrollen zu verursachen.
- Das mobile Menü ist geöffnet und die Bildschirmbreite wird auf Desktop-Breite
  vergrößert: das Menü schließt sich bzw. die Desktop-Navigation wird angezeigt.

## Requirements *(mandatory)*

### Functional Requirements

**Identität und Stimmabgabe**

- **FR-001**: Die Abstimmungsseite MUST bei fehlender Identität und aktiver
  Abstimmung oberhalb der Optionen einen Hinweis mit einer Aktion zum Setzen der
  Identität anzeigen.
- **FR-002**: Die Aktion aus FR-001 MUST den bestehenden Identitätseditor direkt
  auf der Abstimmungsseite öffnen; ein Verweis auf die Startseite entfällt.
- **FR-003**: Optionen MUST bei fehlender Identität sichtbar, optisch als nicht
  verfügbar erkennbar und für assistive Technologien als nicht verfügbar
  gekennzeichnet sein.
- **FR-004**: Nach erfolgreichem Setzen der Identität MUST die Abstimmungsseite die
  Optionen ohne Neuladen auswählbar machen und eine vorhandene Stimme dieser
  Identität anzeigen.
- **FR-005**: Die Startseite MUST bei fehlender Identität das Setzen der Identität
  als visuell hervorgehobene Hauptaktion darstellen.

**Abstimmungsliste**

- **FR-006**: Die Abstimmungsliste MUST einen Filter „Alle“ anbieten, der keine
  Einschränkung nach Erstellungsdatum vornimmt.
- **FR-007**: „Alle“ MUST der Standardfilter sein, wenn die Listenadresse keinen
  gültigen Datumsfilter enthält; explizit gewählte Filter MUST in der Adresse
  erhalten bleiben.
- **FR-008**: Bei aktivem Datumsfilter ohne Treffer MUST der Leerzustand den
  aktiven Filter benennen und die Aktion „Filter zurücksetzen“ anbieten, die
  zu „Alle“ zurückkehrt.

**Kopfzeile und Navigation**

- **FR-009**: Bei schmalen Bildschirmen MUST die Anwendung genau eine Kopfzeile
  mit Logo, Sprachauswahl, Theme-Auswahl und Menüschaltfläche anzeigen.
- **FR-010**: Das mobile Menü MUST alle Navigationsziele sowie den
  Identitätsstatus mit Aktion zum Bearbeiten enthalten, per Tastatur bedienbar
  sein, mit Escape schließen und seinen geöffneten Zustand für assistive
  Technologien kennzeichnen. Das Menü enthält keinen Identitätseditor: Die
  Aktion „Identität bearbeiten“ MUST das Menü schließen und den bestehenden
  Identitätseditor in einem eigenen Dialog öffnen. Auf der Startseite ohne
  gesetzte Identität MUST das Menü nur den Status ohne Bearbeitungsaktion zeigen.
- **FR-011**: Texte in der Kopfzeile MUST bei 375px Breite vollständig lesbar und
  nicht abgeschnitten sein.

**Hierarchie**

- **FR-012**: Die Abstimmungsseite MUST den Abstimmungstitel als einzige
  Hauptüberschrift verwenden; die generische Überschrift „Abstimmung“ im
  Metadatenbereich entfällt.
- **FR-013**: Die Startseite MUST auf eine große Überschrift verzichten, die nur
  den bereits in der Kopfzeile sichtbaren Produktnamen wiederholt; für
  Screenreader bleibt eine Hauptüberschrift vorhanden.
- **FR-014**: Die Startseite MUST genau eine vollständige Identitätskarte zeigen;
  bei gesetzter Identität darf zusätzlich höchstens ein kompakter
  Identitätsstatus erscheinen. Das gilt für Desktop-Seitenleiste und mobiles
  Menü gleichermaßen; ohne Identität zeigt das mobile Menü auf der Startseite
  nur den Status „nicht gesetzt“ ohne Bearbeitungsaktion (FR-010).
- **FR-015**: „Neueste öffentliche Abstimmungen“ MUST die hervorgehobene
  Abstimmung ausschließen und entfallen, wenn danach keine Einträge verbleiben.
- **FR-016**: Der Metadatenbereich der Abstimmungsseite MUST ohne eigene
  Hintergrundfläche (er nutzt den Seitenhintergrund) und ohne Schatten
  dargestellt werden; erlaubt ist höchstens eine dezente Trennlinie.

**Konsistenz**

- **FR-017**: Jeder Poll-Lebenszyklusstatus MUST überall in derselben Form und
  Farbe gekennzeichnet werden.
- **FR-018**: Stimmenzahlen MUST mit Beschriftung angezeigt werden und dürfen
  nicht wie ein Benachrichtigungszähler gestaltet sein.
- **FR-019**: Elemente, die eine Aktion auslösen, MUST als Schaltfläche und
  Elemente, die navigieren, MUST als Link gestaltet sein; beide Stile MUST
  anwendungsweit einheitlich sein.
- **FR-020**: Die hervorgehobene Abstimmung darf nicht als Karte innerhalb einer
  weiteren Karte dargestellt werden.

**Texte**

- **FR-021**: Stimmenzahlen MUST sprachabhängig korrekt in Singular und Plural
  formuliert sein, und zwar auf Startseite, Abstimmungsliste, Abstimmungsseite
  sowie Ergebnis- und Optionsseiten.
- **FR-022**: Ein angezeigtes Enddatum MUST als „Endet am“ (bzw. sprachliche
  Entsprechung) beschriftet sein.
- **FR-023**: Die Zeile „Optionsnummer n“ unter Optionen MUST entfallen.
- **FR-024**: Der Titel des Prüfprotokolls MUST lokalisiert sein (Deutsch:
  „Prüfprotokoll“). Alle weiteren deutschen Texte, die „Audit“ verwenden
  (einschließlich Admin-Dialoge und Kontextbereiche), MUST ebenfalls
  „Prüfprotokoll“ verwenden.
- **FR-025**: Alle neuen oder geänderten sichtbaren Texte MUST in allen
  unterstützten Sprachen gepflegt werden.

**Barrierefreiheit**

- **FR-026**: Alle interaktiven Elemente auf Start-, Listen- und Abstimmungsseite
  MUST eine Trefferfläche von mindestens 44×44px haben.
- **FR-027**: Überzeilen MUST mindestens 12px Schriftgröße haben.
- **FR-028**: Auswahlindikatoren der Optionen MUST in allen Themes einen Kontrast
  von mindestens 3:1 zum Hintergrund haben.
- **FR-029**: Navigations-Landmarks MUST eindeutig benannt sein; nicht aktive
  Navigationen MUST vor assistiven Technologien vollständig verborgen sein.
- **FR-030**: Links auf Abstimmungskarten MUST einen zugänglichen Namen haben, der
  aus dem Abstimmungstitel besteht, optional ergänzt um den Status.

**Allgemein**

- **FR-031**: Alle Änderungen MUST in allen vier Themes (Hell, Dunkel, Sepia, Eco)
  sowie bei 375px und Desktop-Breite funktionieren.
- **FR-032**: Der bestehende HTTP-Vertrag MUST unverändert bleiben; die Änderungen
  betreffen ausschließlich die Darstellung.

### Key Entities

- **Listenfilter**: Zustand der Abstimmungsliste aus Sortierung und Datumsfilter
  („Alle“, „Gestern“, „Heute“, „Morgen“, „Datum“ mit Intervall); in der
  Listenadresse abgebildet.
- **Statuskennzeichnung**: Einheitliche visuelle Darstellung eines
  Poll-Lebenszyklusstatus.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Eine Person ohne Identität kann eine aktive Abstimmung öffnen, eine
  Identität setzen und eine Stimme abgeben, ohne die Abstimmungsseite zu verlassen.
- **SC-002**: Beim ersten Öffnen der Abstimmungsliste ohne Parameter sind 100 %
  der öffentlichen Abstimmungen sichtbar.
- **SC-003**: Bei 375×812px belegt die Kopfzeile höchstens 80px Höhe, und auf
  Start-, Listen- und Abstimmungsseite ist Seiteninhalt ohne Scrollen sichtbar.
- **SC-004**: Bei 375px Breite gibt es auf keiner der drei Seiten abgeschnittene
  Texte oder horizontales Scrollen.
- **SC-005**: Jede Seite hat genau eine Hauptüberschrift; die Startseite zeigt genau
  eine vollständige Identitätskarte; keine Abstimmung erscheint auf der Startseite
  doppelt.
- **SC-006**: 100 % der interaktiven Elemente auf den drei Seiten erfüllen die
  Mindesttrefferfläche von 44×44px, und keine Überzeile ist kleiner als 12px.
- **SC-007**: Eine automatisierte Barrierefreiheitsprüfung der drei Seiten meldet
  in allen vier Themes keine Verstöße zu doppelten Landmark-Namen, Linknamen oder
  Textkontrast.
- **SC-009**: Ein automatischer Browser-Test misst in allen vier Themes für die
  Auswahlkreise der Optionen ein Kontrastverhältnis von mindestens 3:1 zwischen
  Rand und umgebendem Hintergrund.
- **SC-008**: In allen unterstützten Sprachen gibt es auf Start-, Listen-,
  Abstimmungs-, Ergebnis- und Optionsseiten keine grammatikalisch falsche
  Stimmenzahl (z. B. „1 Stimmen“).

## Assumptions

- Die Datumsfilterung erfolgt clientseitig über die vollständige öffentliche
  Abstimmungsliste; der Filter „Alle“ benötigt keine Erweiterung des
  HTTP-Vertrags.
- Auf schmalen Bildschirmen wird die Navigation in ein ausklappbares Menü
  verlagert; eine untere Tab-Leiste ist nicht Teil dieses Umfangs.
- Der Inline-Identitätseditor nutzt dieselbe Validierung und dieselben
  Bestätigungsschritte wie der bestehende Identitätseditor.
- Die Anzeige der Restlaufzeit zusätzlich zu „Endet am“ ist nicht Teil dieses
  Umfangs.
- Die hervorgehobene Abstimmung wird aus „Neueste öffentliche Abstimmungen“
  ausgeschlossen statt den Abschnitt generell auszublenden.
- Administrationsseiten sind nur betroffen, soweit sie gemeinsame Kopfzeile,
  Statuskennzeichnung, Link-/Schaltflächenstile oder Texte nutzen.
- Bestehende Tests der Start-, Listen-, Abstimmungs- und App-Ansicht werden an das
  geänderte Verhalten angepasst.
