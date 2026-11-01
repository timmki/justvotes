# Quickstart: UX-Nacharbeiten validieren

## Voraussetzungen

- Lokale Entwicklungsumgebung laut [README](../../README.md) (Backend mit `bootstrap/dev.env`,
  Frontend-Dev-Server auf `http://localhost:5173`).
- Testdaten: mindestens drei Abstimmungen in unterschiedlichen Zuständen (aktiv, abgelaufen mit
  mehr als zehn Optionen und mindestens einer Stimme, gelöscht), ein User-Konto mit Identität.

## Automatische Prüfungen

```bash
cd frontend && pnpm typecheck && pnpm lint && pnpm test
```

```bash
cd frontend && pnpm test:e2e
```

Erwartet: alle Tests grün, einschließlich des neuen `e2e/ux-critique.spec.ts` mit axe-Prüfung
ohne Verstöße für fehlende Labels und Textkontrast.

## Manuelle Szenarien

| # | Schritte | Erwartung | Spec |
|---|---|---|---|
| 1 | Als Administrator jeden Bereich der Seitenleiste öffnen | H1 = Bereichsname, eigener Untertitel, Kopfzeile „Administration › …“, Tab-Titel „… · JustVotes“ | US1, [UI §1](contracts/ui-contract.md) |
| 2 | Als User die abgelaufene Abstimmung bei 1280×860 und 375×812 öffnen | Hinweis und „Ergebnisse ansehen“ ohne Scrollen sichtbar, Optionen als Liste, eigene Stimme markiert | US2, [UI §2](contracts/ui-contract.md) |
| 3 | Als Administrator `/admin/polls` öffnen | alle Abstimmungen zugeklappt und ohne Scrollen sichtbar; Aufklappen per Enter/Leertaste funktioniert; >10 Optionen gekürzt | US3, [UI §3](contracts/ui-contract.md) |
| 4 | „Neue Abstimmung“ → leer speichern → ausfüllen → speichern | Fehler am Feld, Fokus im Titelfeld; danach Panel zu, neue Abstimmung aufgeklappt | US3, US4 |
| 5 | Login mit leeren Feldern absenden | Button bedienbar, Feldfehler, Fokus auf E-Mail, keine Anmeldeanfrage | US4 |
| 6 | Formulare in Vorlagengruppen, Optionsvorlagen, Einladungen vergleichen | gleiche Label- und Felddarstellung, eine gefüllte Primäraktion je Formular | US4, [UI §4](contracts/ui-contract.md) |
| 7 | Gelöschte Abstimmung → „Endgültig löschen“ → abbrechen | Bestätigung nennt Titel, Abbrechen ändert nichts; Aktion steht abgesetzt am Ende | US5, [UI §5](contracts/ui-contract.md) |
| 8 | Sprache auf EN umschalten und Szenarien 1, 2, 7 wiederholen | alle neuen Texte englisch | FR-030 |
| 9 | Startseite ohne aktive Abstimmung, Ergebnisseite | Überschrift vor Erklärung, ein „Alle Abstimmungen anzeigen“, „Stimmen ansehen“ nur bei Stimmen > 0 | US6, [UI §6](contracts/ui-contract.md) |
| 10 | Seiten aus 1–9 bei 375 px Breite | kein horizontales Scrollen, Fokus sichtbar | FR-031 |
