# Quickstart: Validierung Einladungen aus einer vCard-Datei

Endpunkte: [contracts/openapi-delta.md](contracts/openapi-delta.md);
Regeln: [data-model.md](data-model.md).

## Voraussetzungen

- Lokale Instanz wie in [006 Quickstart](../006-local-user-auth/quickstart.md)
  mit `bootstrap/dev.env` (aus `dev.env.example`) und Mailpit
  (`docker run --rm -p 1025:1025 -p 8025:8025 axllent/mailpit`, `MAIL_HOST=localhost`, `MAIL_PORT=1025`, `MAIL_STARTTLS=false`).
- **Nur synthetische Testdateien** verwenden (z. B. `frontend/e2e/fixtures/contacts.vcf`);
  keine echten Adressbücher ins Repository oder in Tickets.

Synthetische Datei mit allen Fällen (Beispielinhalt):

```text
BEGIN:VCARD / VERSION:3.0 / FN:Anna Beispiel / EMAIL;TYPE=HOME:anna@example.test / TEL… / END:VCARD
BEGIN:VCARD / VERSION:4.0 / FN:Bert Muster / EMAIL:bert.alt@example.test / EMAIL;PREF=1:bert@example.test / END:VCARD
BEGIN:VCARD / VERSION:3.0 / FN:Jörg Ümlaut / EMAIL:joerg@example.test / ADR;TYPE=HOME:;;Weg 1;Stadt;;12345;DE / END:VCARD
BEGIN:VCARD / VERSION:3.0 / FN:Ohne Adresse / END:VCARD
BEGIN:VCARD / VERSION:3.0 / FN:Kaputt / EMAIL:kein-at-zeichen / END:VCARD
BEGIN:VCARD / VERSION:3.0 / FN:Anna Doppelt / EMAIL:ANNA@example.test / END:VCARD
```

## Automatisierte Prüfungen

```powershell
mvn -s .mvn/settings.xml test
```

```bash
cd frontend && pnpm build && pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e
```

Erwartete neue Abdeckung: Leser (Versionen, Faltung, Escapes, PREF, Gruppen,
Umlaute, Grenzen), Domänenbewertung (alle `ContactOutcome`), Erneuerung,
Vorschlag löschen bei Annahme/Widerruf, HTTP-Zugriffsmatrix der neuen
Operationen, Frontend-Vorschau/Auswahl/Zusammenfassung, E2E inkl. 320/375 px
und axe.

## Manuelle Szenarien

| # | Schritte | Erwartung | Spec |
|---|---|---|---|
| 1 | Als Admin *Einladungen → Aus Datei einladen*, synthetische Datei wählen | Vorschau: Anna, Bert (`bert@example.test`), Jörg „wird eingeladen“; „keine E-Mail-Adresse“, „ungültige E-Mail-Adresse“, „doppelt in der Datei“; Umlaute korrekt; nichts in Mailpit | US1, US2, FR-002–FR-006 |
| 2 | Jörg abwählen, Sprache Englisch, bestätigen | Zusammenfassung: 2 eingeladen; 2 englische Mails in Mailpit; Einladungsliste zeigt beide | US1, US3, FR-007–FR-011 |
| 3 | Link von Anna öffnen | Anzeigename mit „Anna Beispiel“ vorausgefüllt und änderbar | FR-018, SC-007 |
| 4 | Datei erneut wählen | Anna/Bert „bereits eingeladen“, Jörg „wird eingeladen“ | US2 |
| 5 | Annas Einladung in der DB auf abgelaufen setzen (oder Uhr vorstellen), Datei erneut wählen und bestätigen | Anna „Einladung wird erneuert“; neue Mail, alter Link ungültig; keine zweite Einladung | FR-019 |
| 6 | Anna nimmt an; Datei erneut wählen | Anna „hat bereits ein Konto“; Vorschlag an Annas Einladung ist gelöscht | FR-014, US2 |
| 7 | Datei > 1 MB, Datei mit 501 Kontakten, Textdatei ohne vCard; Datei mit einem Eintrag ohne `END:VCARD` | jeweils verständliche Meldung, keine Vorschau; beim beschädigten Eintrag Vorschau mit Hinweis „1 Eintrag konnte nicht gelesen werden“ | FR-012, FR-013, Edge Case |
| 8 | `MAIL_HOST` entfernen, neu starten | Import nicht angeboten bzw. `invitation-delivery-unavailable` | FR-016 |
| 9 | Logausgabe `justvotes.security` prüfen | `invitation-issued`/`-resent`, `contact-import` mit Zählern; keine Namen/Adressen | FR-015, SC-005 |
| 10 | Ablauf bei 320 px, nur Tastatur, Englisch | bedienbar, Fokus sichtbar, Texte übersetzt | FR-017 |
| 11 | **Nur lokal**: die echte Beispieldatei des Auftraggebers wählen, Vorschau ansehen, abbrechen | Alle Kontakte mit E-Mail erscheinen mit korrekten Namen; nichts versendet; Datei nicht ins Repository kopieren | SC-004, research R12 |
