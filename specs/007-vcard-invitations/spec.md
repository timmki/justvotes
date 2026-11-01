# Feature Specification: Einladungen aus einer vCard-Datei

**Feature Branch**: `007-vcard-invitations`

**Created**: 2026-11-01

**Status**: Draft

**Input**: User description: "Ergänze eine Funktion, um Einladungen über eine vCard-Datei (.vcf) zu senden. Der Administrator lädt eine vcf-Datei mit mehreren Kontakten hoch (Beispiel: vCard 3.0 und 4.0 gemischt, je Kontakt FN, N, EMAIL mit TYPE/PREF-Parametern, teils weitere Felder wie TEL, ADR, BDAY, UID), und das System versendet für die enthaltenen E-Mail-Adressen Einladungen wie bei der bestehenden Einzeleinladung."

## Clarifications

### Session 2026-11-01

- Q: Soll der Name aus der vCard als Anzeigename der eingeladenen Person vorgeschlagen werden? → A: Ja, als änderbarer Vorschlag: Der Name wird an der Einladung gespeichert und auf der Einladungsseite als Anzeigename vorausgefüllt; die Person kann ihn ändern.
- Q: Wie wird mit Kontakten umgegangen, deren frühere Einladung abgelaufen ist, ohne dass ein Konto angelegt wurde? → A: Die abgelaufene Einladung wird beim Versand erneuert (neuer Link, neue 7 Tage) statt eine zweite anzulegen; die Vorschau markiert den Kontakt als „Einladung wird erneuert“.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Kontakte aus einer vCard-Datei einladen (Priority: P1)

Der Administrator hat die Mitglieder seiner Gruppe als Kontaktliste in seinem
Adressbuch und exportiert sie als eine vCard-Datei. Statt jede Adresse einzeln
abzutippen, wählt er unter *Administration → Einladungen* diese Datei aus. Das
System liest die Kontakte und zeigt eine Vorschau: je Kontakt den Namen, die
E-Mail-Adresse, die eingeladen würde, und ob eine Einladung möglich ist. Der
Administrator prüft die Liste, wählt die Sprache der Einladungen und bestätigt.
Für alle einladbaren Kontakte wird dann je eine Einladung wie bei der
bestehenden Einzeleinladung angelegt und per E-Mail versendet. Anschließend
sieht er eine Zusammenfassung, wie viele Einladungen versendet wurden und
welche Kontakte aus welchem Grund übersprungen wurden.

**Why this priority**: Das ist der Kern der Funktion. Ohne sie bleibt nur die
mühsame Einzeleinladung, die bei Dutzenden Personen fehleranfällig ist.

**Independent Test**: Eine Datei mit mehreren gültigen Kontakten hochladen,
bestätigen und prüfen, dass für jede Adresse genau eine offene Einladung mit
E-Mail existiert und die Zusammenfassung die Anzahl nennt.

**Acceptance Scenarios**:

1. **Given** eine vCard-Datei mit mehreren Kontakten, die je eine noch nicht
   eingeladene E-Mail-Adresse haben, **When** der Administrator die Datei
   auswählt, **Then** sieht er eine Vorschau mit Name und E-Mail-Adresse jedes
   Kontakts, alle als „wird eingeladen“ markiert, und es wurde noch nichts
   versendet.
2. **Given** die Vorschau, **When** der Administrator bestätigt, **Then** wird
   für jeden einladbaren Kontakt eine Einladung angelegt und versendet, und
   die Zusammenfassung nennt die Anzahl der versendeten Einladungen.
3. **Given** die Vorschau, **When** der Administrator abbricht, **Then** wird
   keine Einladung angelegt und keine E-Mail versendet.
4. **Given** eine Datei, in der vCard-Versionen 3.0 und 4.0 gemischt sind und
   Kontakte zusätzliche Angaben wie Telefonnummer, Anschrift oder Geburtstag
   enthalten, **When** sie ausgewählt wird, **Then** werden alle Kontakte mit
   E-Mail-Adresse erkannt; die zusätzlichen Angaben werden ignoriert.
5. **Given** die versendeten Einladungen, **When** der Administrator die
   Einladungsliste ansieht, **Then** erscheinen sie dort wie Einzeleinladungen
   und lassen sich ebenso erneut versenden oder widerrufen.
6. **Given** eine aus der vCard angelegte Einladung für einen Kontakt mit Namen,
   **When** die eingeladene Person den Link öffnet, **Then** ist der Anzeigename
   mit diesem Namen vorausgefüllt und sie kann ihn vor dem Anlegen ändern.

---

### User Story 2 - Nicht einladbare Kontakte verständlich erkennen (Priority: P1)

Exportierte Adressbücher enthalten oft Personen, die schon ein Konto haben,
bereits eingeladen sind, doppelt vorkommen oder gar keine bzw. eine
fehlerhafte E-Mail-Adresse haben. Die Vorschau kennzeichnet solche Kontakte
mit einem verständlichen Grund und schließt sie vom Versand aus, damit niemand
doppelt angeschrieben wird und der Administrator weiß, wen er anders erreichen
muss.

**Why this priority**: Ohne diese Prüfung würden bestehende Mitglieder erneut
angeschrieben oder Fehler erst nach dem Versand sichtbar. Sie gehört zum
nutzbaren Kern.

**Independent Test**: Eine Datei mit je einem Kontakt pro Ausschlussgrund
hochladen und prüfen, dass jeder mit dem richtigen Grund markiert ist und nach
dem Bestätigen nur die einladbaren Kontakte eine Einladung erhalten.

**Acceptance Scenarios**:

1. **Given** ein Kontakt, dessen E-Mail-Adresse (ohne Beachtung der
   Groß-/Kleinschreibung) bereits zu einem Konto gehört, **When** die Vorschau
   angezeigt wird, **Then** ist er als „hat bereits ein Konto“ markiert und wird
   nicht eingeladen.
2. **Given** ein Kontakt mit einer Adresse, für die bereits eine offene, noch
   gültige Einladung besteht, **When** die Vorschau angezeigt wird, **Then** ist
   er als „bereits eingeladen“ markiert und wird nicht erneut eingeladen.
3. **Given** ein Kontakt mit einer Adresse, deren Einladung abgelaufen ist, ohne
   dass ein Konto angelegt wurde, **When** die Vorschau angezeigt wird und der
   Administrator bestätigt, **Then** ist er als „Einladung wird erneuert“
   markiert, die bestehende Einladung erhält einen neuen Link mit neuer Frist
   und wird erneut versendet; es entsteht keine zweite Einladung.
4. **Given** zwei Kontakte mit derselben Adresse in der Datei, **When** die
   Vorschau angezeigt wird, **Then** wird die Adresse nur einmal eingeladen und
   der zweite Kontakt als „doppelt in der Datei“ markiert.
5. **Given** ein Kontakt ohne E-Mail-Adresse oder mit einer ungültigen
   Adresse, **When** die Vorschau angezeigt wird, **Then** ist er als „keine
   E-Mail-Adresse“ bzw. „ungültige E-Mail-Adresse“ markiert.
6. **Given** ein Kontakt mit mehreren E-Mail-Adressen, **When** die Vorschau
   angezeigt wird, **Then** wird die als bevorzugt gekennzeichnete Adresse
   verwendet, sonst die erste; die verwendete Adresse ist in der Vorschau
   sichtbar.

---

### User Story 3 - Auswahl vor dem Versand anpassen (Priority: P2)

Nicht jeder Kontakt im Adressbuch soll eingeladen werden. Der Administrator
kann in der Vorschau einzelne einladbare Kontakte abwählen, bevor er
bestätigt. Nur die ausgewählten Kontakte werden eingeladen.

**Why this priority**: Erhöht die Kontrolle, ist aber verzichtbar, solange der
Administrator die Datei vorher im Adressbuch bereinigen kann.

**Independent Test**: In der Vorschau zwei Kontakte abwählen, bestätigen und
prüfen, dass genau diese beiden keine Einladung erhalten haben.

**Acceptance Scenarios**:

1. **Given** die Vorschau, **When** der Administrator einen einladbaren Kontakt
   abwählt und bestätigt, **Then** erhält dieser keine Einladung, alle anderen
   ausgewählten schon.
2. **Given** die Vorschau, **When** alle Kontakte abgewählt sind, **Then** kann
   der Versand nicht bestätigt werden.

---

### Edge Cases

- Die Datei ist keine vCard-Datei, leer oder enthält keinen einzigen Kontakt:
  verständliche Meldung, keine Vorschau, nichts wird versendet.
- Die Datei ist zu groß oder enthält mehr Kontakte als erlaubt: verständliche
  Meldung mit der Grenze, nichts wird versendet.
- Einzelne Kontakte sind beschädigt (z. B. fehlendes Ende eines Eintrags): die
  lesbaren Kontakte erscheinen in der Vorschau, der beschädigte Teil wird als
  nicht lesbar gemeldet.
- Namen enthalten Umlaute, Akzente oder Sonderzeichen, die Datei verwendet
  gefaltete (umbrochene) Zeilen oder kodierte Werte: Namen und Adressen werden
  korrekt dargestellt.
- Ein Kontakt hat keinen Namen: die Vorschau zeigt stattdessen die
  E-Mail-Adresse, und der Anzeigename wird nicht vorausgefüllt.
- Der vorgeschlagene Anzeigename ist bereits vergeben oder verletzt die Regeln
  für Anzeigenamen: die Person sieht beim Anlegen die übliche Meldung am Feld
  und wählt einen anderen Namen; die Einladung bleibt gültig.
- Der E-Mail-Versand ist nicht eingerichtet: die Funktion wird wie die
  Einzeleinladung nicht angeboten bzw. mit derselben Meldung abgelehnt.
- Zwischen Vorschau und Bestätigung wird eine Adresse anderweitig eingeladen
  oder bekommt ein Konto: sie wird beim Versand übersprungen und in der
  Zusammenfassung mit Grund genannt.
- Der Versand einzelner E-Mails schlägt fehl: die Einladungen bleiben bestehen
  und sind wie bei der Einzeleinladung als „Versand fehlgeschlagen“ markiert
  und erneut versendbar.
- Die Datei enthält die Adresse des Administrators: sie wird als „hat bereits
  ein Konto“ übersprungen.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Der Administrator MUST unter der Einladungsverwaltung eine
  vCard-Datei (`.vcf`) auswählen können; die Funktion steht nur dem
  Administrator zur Verfügung.
- **FR-002**: Das System MUST vCard-Dateien der Versionen 3.0 und 4.0 lesen,
  auch gemischt in einer Datei, einschließlich gefalteter Zeilen, Parametern
  an Eigenschaften (z. B. Typ und Bevorzugung) und UTF-8-kodierter Namen.
- **FR-003**: Aus jedem Kontakt MUST das System nur den Namen (`FN`, ersatzweise
  aus `N`) und die E-Mail-Adresse auswerten; alle anderen Angaben (Telefon,
  Anschrift, Geburtstag, Kennungen usw.) MUST ignoriert und nicht gespeichert
  werden.
- **FR-004**: Hat ein Kontakt mehrere E-Mail-Adressen, MUST die als bevorzugt
  markierte, sonst die erste verwendet werden.
- **FR-005**: Vor jedem Versand MUST das System eine Vorschau aller Kontakte
  anzeigen mit Name, verwendeter E-Mail-Adresse und Ergebnis: „wird
  eingeladen“, „Einladung wird erneuert“ oder einem der Gründe „hat bereits ein
  Konto“, „bereits eingeladen“, „doppelt in der Datei“, „keine E-Mail-Adresse“, „ungültige
  E-Mail-Adresse“.
- **FR-006**: Allein durch Auswählen der Datei und Anzeigen der Vorschau MUST
  keine Einladung angelegt und keine E-Mail versendet werden.
- **FR-007**: Der Administrator MUST einladbare Kontakte in der Vorschau
  abwählen können; ist kein Kontakt ausgewählt, MUST der Versand nicht
  bestätigt werden können.
- **FR-008**: Der Administrator MUST für den gesamten Versand eine Sprache der
  Einladungs-E-Mail wählen können, wie bei der Einzeleinladung.
- **FR-009**: Nach Bestätigung MUST für jeden ausgewählten, einladbaren Kontakt
  genau eine Einladung angelegt werden, die in Gültigkeit, Einmaligkeit,
  E-Mail-Inhalt, Status, erneutem Versand und Widerruf einer Einzeleinladung
  entspricht.
- **FR-010**: Die Regel „höchstens ein Konto oder eine offene Einladung pro
  E-Mail-Adresse“ (ohne Beachtung der Groß-/Kleinschreibung) MUST auch beim
  Versand gelten; zwischenzeitlich vergebene Adressen werden übersprungen.
- **FR-019**: Ist die Einladung einer Adresse abgelaufen, ohne dass ein Konto
  angelegt wurde, MUST der Versand diese Einladung erneuern (neuer Link, neue
  Gültigkeit von 7 Tagen, alter Link ungültig, erneuter E-Mail-Versand) statt
  eine weitere anzulegen; ein vorgeschlagener Anzeigename aus der Datei MUST
  dabei übernommen werden. Widerrufene Einladungen gelten nicht als bestehend.
- **FR-011**: Nach dem Versand MUST eine Zusammenfassung die Zahl der
  angelegten und der erneuerten Einladungen, die Zahl der fehlgeschlagenen Zustellungen und jeden
  übersprungenen Kontakt mit Grund zeigen.
- **FR-012**: Ungültige, leere, nicht lesbare oder zu große Dateien MUST mit
  einer verständlichen Meldung abgelehnt werden, die sagt, was zu tun ist.
- **FR-013**: Die Datei MUST höchstens 1 MB groß sein und höchstens 500
  Kontakte enthalten.
- **FR-014**: Die hochgeladene Datei MUST nach Vorschau bzw. Versand nicht
  gespeichert werden. Dauerhaft bleiben nur die Einladungen; an einer aus der
  vCard angelegten Einladung MUST zusätzlich der Name des Kontakts als
  vorgeschlagener Anzeigename gespeichert werden. Dieser Vorschlag MUST
  entfernt werden, sobald die Einladung angenommen oder widerrufen wird.
- **FR-018**: Öffnet die eingeladene Person einen Einladungslink mit
  vorgeschlagenem Anzeigenamen, MUST das Feld „Anzeigename“ damit vorausgefüllt
  und änderbar sein; es gelten unverändert alle Regeln für Anzeigenamen
  (eindeutig, 1–64 Zeichen, nach dem Anlegen unveränderlich).
- **FR-015**: Jede angelegte Einladung MUST wie eine Einzeleinladung als
  sicherheitsrelevantes Ereignis protokolliert werden, ohne Namen oder
  E-Mail-Adressen der Kontakte im Protokoll.
- **FR-016**: Ist der E-Mail-Versand nicht eingerichtet, MUST die Funktion
  genauso reagieren wie die Einzeleinladung (nicht angeboten bzw. mit
  derselben Meldung abgelehnt).
- **FR-017**: Die Oberfläche (Dateiauswahl, Vorschau, Zusammenfassung) MUST
  barrierefrei, per Tastatur bedienbar, auf schmalen Bildschirmen nutzbar und
  auf Deutsch und Englisch verfügbar sein wie die übrigen Administrationsseiten.

### Key Entities *(include if feature involves data)*

- **vCard-Datei**: Vom Administrator ausgewählte Kontaktdatei. Wird nur für
  Vorschau und Versand ausgewertet, nicht gespeichert.
- **Importierter Kontakt**: Ein Eintrag der Datei mit Anzeigename, verwendeter
  E-Mail-Adresse, Ergebnis (einladbar oder Ausschlussgrund) und Auswahlstatus.
  Existiert nur während Vorschau und Versand.
- **Einladung**: Bestehende Entität der Einzeleinladung; jeder eingeladene
  Kontakt erzeugt genau eine. Neu: optionaler vorgeschlagener Anzeigename aus
  der vCard, der bis zur Annahme oder zum Widerruf gespeichert bleibt.
- **Versandergebnis**: Zusammenfassung eines Versands mit Anzahl angelegter
  und erneuerter Einladungen, fehlgeschlagener Zustellungen und übersprungener Kontakte mit
  Grund.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Der Administrator kann 50 Personen aus einer Adressbuch-Datei in
  unter 2 Minuten einladen, gemessen vom Auswählen der Datei bis zur
  Zusammenfassung.
- **SC-002**: Bei einer Datei mit 500 Kontakten erscheint die Vorschau in unter
  5 Sekunden.
- **SC-003**: In 100 % der geprüften Fälle erhält keine Adresse, die bereits zu
  einem Konto oder einer offenen Einladung gehört oder in der Datei doppelt
  vorkommt, eine weitere Einladung.
- **SC-004**: Die Beispieldatei des Auftraggebers (vCard 3.0 und 4.0 gemischt,
  mit Zusatzfeldern) wird vollständig gelesen: jeder Kontakt mit E-Mail-Adresse
  erscheint in der Vorschau mit korrekt dargestelltem Namen.
- **SC-005**: In 100 % der geprüften Fälle werden keine Telefonnummern,
  Anschriften oder Geburtstage gespeichert oder protokolliert; Kontaktnamen
  erscheinen in keinem Protokoll und sind nach Annahme oder Widerruf der
  Einladung nicht mehr gespeichert.
- **SC-007**: Eine eingeladene Person mit Namen in der vCard kann ihr Konto
  anlegen, ohne den Anzeigenamen selbst einzutippen.
- **SC-006**: Jeder übersprungene Kontakt ist in Vorschau und Zusammenfassung
  mit einem verständlichen Grund benannt, sodass der Administrator ohne
  weitere Hilfe weiß, warum er nicht eingeladen wurde.

## Assumptions

- Die Funktion ergänzt die bestehende Einzeleinladung aus Feature
  `006-local-user-auth` und übernimmt deren Regeln: 7 Tage Gültigkeit,
  einmaliger Link, Rolle „User“, E-Mail-Adresse als späterer Anmeldename.
- Der Name aus der vCard wird nur als änderbarer Vorschlag für den
  Anzeigenamen verwendet; die eingeladene Person entscheidet selbst, unter
  welchem Namen sie erscheint. Einzeleinladungen bleiben ohne Vorschlag.
- Eine Sprache gilt für alle Einladungen eines Versands; unterschiedliche
  Sprachen erfordern mehrere Versände.
- Die Grenzen 1 MB und 500 Kontakte reichen für Vereine und Gruppen deutlich
  aus; größere Listen werden in mehrere Dateien aufgeteilt.
- Andere Kontaktformate (CSV, Excel, Anbindung an Online-Adressbücher) sind
  nicht Teil dieser Funktion.
- Ein Versand ist nicht atomar: bereits angelegte Einladungen bleiben bestehen,
  auch wenn einzelne Zustellungen fehlschlagen; diese sind erneut versendbar.
