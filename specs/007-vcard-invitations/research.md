# Research: Einladungen aus einer vCard-Datei

## R1 – vCard lesen: eigener Leser statt Bibliothek

- **Decision**: Kleiner eigener Leser `VCardContactReader` im Eingangsadapter.
  Er unterstützt, was FR-002/FR-003 verlangen: `BEGIN`/`END:VCARD`,
  Versionen 3.0 und 4.0, Zeilenentfaltung (Fortsetzungszeilen mit Leerzeichen
  oder Tab), CRLF/LF, Gruppenpräfixe (`item1.EMAIL`), Parameter in beliebiger
  Groß-/Kleinschreibung (`TYPE=HOME`, `PREF=1`, vCard‑3 `TYPE=pref`), Escapes
  `\,` `\;` `\\` `\n`, UTF-8 sowie `FN`, `N` und `EMAIL`. Alle anderen
  Eigenschaften werden überlesen, ohne sie zu interpretieren.
- **Rationale**: Die Constitution verlangt, keine unnötigen Abhängigkeiten
  einzuführen; benötigt werden nur drei Eigenschaften. Ein fokussierter Leser
  ist mit Unit-Tests gut absicherbar.
- **Alternatives considered**: `ez-vcard` (vollständig, aber neue Abhängigkeit
  für drei Felder); Parsen im Browser (dann müsste die Domäne einer
  Client-Interpretation vertrauen und Dateiregeln wären doppelt).

## R2 – Bevorzugte Adresse

- **Decision**: Reihenfolge: `PREF` mit kleinstem Wert (vCard 4.0, 1 = höchste),
  dann `TYPE=pref` (vCard 3.0), sonst erste `EMAIL` des Kontakts.
- **Rationale**: Entspricht beiden Standards (RFC 6350 / RFC 2426) und FR-004.
- **Alternatives considered**: alle Adressen einladen (würde eine Person
  mehrfach anschreiben).

## R3 – Ablauf: zustandslose Vorschau, Versand mit Neuprüfung

- **Decision**: `POST /admin/invitations/contact-import/preview` nimmt den
  Dateiinhalt (`text/vcard`) und liefert die bewerteten Kontakte;
  `POST /admin/invitations/contact-import` nimmt die ausgewählten Kontakte
  (`email`, optional `name`) und die Sprache als JSON und prüft jeden erneut.
  Der Server hält zwischen beiden Schritten nichts fest.
- **Rationale**: Die Datei wird nie gespeichert (FR-014), zwischenzeitliche
  Änderungen werden erkannt (Edge Case), kein Sitzungs- oder Cache-Zustand.
- **Alternatives considered**: Datei zwischenspeichern und per Kennung
  bestätigen (verstößt gegen FR-014); Versand ohne Vorschau (verstößt gegen
  FR-005/FR-006).

## R4 – Grenzen

- **Decision**: Vorschau-Body ≤ 1 MB (Prüfung im Controller über die
  Content-Length bzw. gelesene Bytes, `413` mit Code
  `contact-import-too-large`); ≤ 500 Kontakte im Leser bzw. im Versand-Request
  (`400 contact-import-too-many`). Leere/ungültige Dateien:
  `400 contact-import-invalid`.
- **Rationale**: FR-012/FR-013; klare Codes erlauben verständliche Meldungen im
  Frontend.

## R5 – Versand: je Kontakt eigene Transaktion

- **Decision**: Der Versand-Endpunkt verarbeitet Kontakte nacheinander; jeder
  Kontakt läuft wie die Einzeleinladung in eigener Transaktion mit
  E-Mail-Versand nach dem Commit (`InvitationDelivery`). Ergebnis je Kontakt:
  `invited`, `renewed`, `delivery-failed` (Einladung besteht, Zustellung
  fehlgeschlagen) oder `skipped` mit Grund.
- **Rationale**: Spec-Annahme „Versand ist nicht atomar“; ein SMTP-Fehler oder
  ein Konflikt bei einem Kontakt darf die anderen nicht zurückrollen.
- **Alternatives considered**: eine Transaktion für alle (ein Fehler rollt
  alles zurück; lange Sperre auf SQLite).

## R6 – Erneuerung abgelaufener Einladungen

- **Decision**: Abgelaufene Einladungen haben weiterhin den Status `OPEN` mit
  vergangenem `expiresAt`. Die Domäne erkennt diesen Zustand und ruft
  `Invitation.reissue` (neuer Token-Hash, neue 7 Tage) auf; ein mitgelieferter
  Name ersetzt den Vorschlag. Gültige offene Einladungen bleiben unverändert
  (`already-invited`).
- **Rationale**: FR-019 ohne zweites Einladungsobjekt; die Regel „höchstens
  eine offene Einladung pro Adresse“ bleibt erhalten.

## R7 – Vorgeschlagener Anzeigename

- **Decision**: Neue nullable Spalte `Invitation.suggestedIdentity`; Werte
  werden mit den Regeln von `AccountIdentity` validiert. Ein Name, der diese
  Regeln nicht erfüllt (z. B. > 64 Zeichen), wird beim Import auf 64 Zeichen
  gekürzt bzw. getrimmt; ist er danach leer, entfällt der Vorschlag. `accept`
  und `revoke` setzen ihn auf `null`. `InvitationPreview` liefert ihn als
  `suggestedUserID`; die Einladungsseite füllt das Feld damit vor.
- **Rationale**: FR-014/FR-018; der Name bleibt nur so lange wie nötig
  gespeichert. Eindeutigkeit wird wie bisher erst beim Anlegen geprüft.

## R8 – Sicherheits-Log

- **Decision**: Pro angelegter bzw. erneuerter Einladung die bestehenden
  Ereignisse `invitation-issued` bzw. `invitation-resent` mit `invitationId`
  und `actorId`; zusätzlich ein Ereignis `contact-import` mit Zählern
  (`invited`, `renewed`, `skipped`, `deliveryFailed`). Keine Namen oder
  Adressen.
- **Rationale**: FR-015, SC-005.

## R9 – Frontend-Upload

- **Decision**: `<input type="file" accept=".vcf,text/vcard,text/x-vcard">`;
  die Datei wird im Browser als Text gelesen und als `text/vcard`-Body
  gesendet. Größe wird vorab im Browser geprüft (gleiche Meldung wie der
  Server). Vorschau als Tabelle bzw. Karten (Container-Query wie Konten), mit
  Kontrollkästchen je einladbarem Kontakt und Sammelauswahl. Ist
  `unreadableEntries` > 0, zeigt die Vorschau oberhalb der Liste den Hinweis
  „N Einträge der Datei konnten nicht gelesen werden“ (Edge Case, FR-012).
- **Rationale**: Kein Multipart nötig, einfacher Vertrag; Darstellung folgt dem
  Muster aus Feature 006.

## R10 – Messung der Vorschaudauer (SC-002)

- **Decision**: Ein HTTP-Test erzeugt 500 synthetische Kontakte (gemischt 3.0/4.0,
  mit Zusatzfeldern) und prüft, dass die Vorschau-Antwort in unter 5 s vorliegt.
  Bewertung nutzt je Kontakt höchstens zwei Abfragen über indizierte
  Schlüssel (`emailKey`); bei Bedarf werden Konten und offene Einladungen für
  die Datei in je einer Abfrage geladen.
- **Rationale**: SC-002 ist sonst nicht überprüfbar; die Schwelle ist großzügig
  genug für langsame CI-Runner.

## R11 – Mailversand nicht eingerichtet

- **Decision**: Beide Import-Operationen antworten mit `409
  invitation-delivery-unavailable`, sobald `InvitationMailer.isAvailable()`
  falsch ist; das Frontend blendet den Import dann wie die Einzeleinladung aus
  und zeigt bei einer `409` dieselbe Meldung. Abgedeckt durch HTTP- und
  Frontend-Test.

## R12 – Beispieldatei des Auftraggebers (SC-004)

- **Decision**: Die automatisierten Tests verwenden eine synthetische Datei,
  die die Struktur der Beispieldatei nachbildet (vCard 3.0 und 4.0 gemischt,
  `EMAIL;TYPE=HOME`, `EMAIL;TYPE=HOME;PREF=1`, `EMAIL;PREF=1`, `TEL`, `ADR`,
  `BDAY;VALUE=DATE`, `UID`, Umlaute und `ß` in `FN`/`N`, Nachnamen mit
  Leerzeichen). Die echte Datei darf nur lokal manuell geprüft und nie
  eingecheckt, in Tickets kopiert oder in Logs ausgegeben werden.
- **Rationale**: Die Beispieldatei enthält echte personenbezogene Daten
  (Namen, Adressen, Telefonnummer, Anschrift, Geburtstag).
