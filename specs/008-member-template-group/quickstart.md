# Quickstart: Automatische Mitglieder-Vorlagengruppe

## Voraussetzungen

- Backend und Frontend laufen lokal (siehe README). Mailpit läuft für Einladungsmails.
- Für die Tests wird ausschließlich das Administratorkonto der Testumgebung verwendet, keine echten Kontaktdaten.

## Automatisierte Prüfungen

```bash
mvn -s .mvn/settings.xml test
```

Erwartet: Domänentests für `Poll.addMemberOption` und den Schutz von `OptionTemplateGroup`. Dazu ein Integrationstest „Einladung annehmen → Option in aktivem Poll“ und ein Test der Migration V9 mit Backfill.

```bash
pnpm --dir frontend test
```

```bash
pnpm --dir frontend test:e2e
```

## Manuelle Szenarien

| # | Schritte | Erwartung | Bezug |
|---|----------|-----------|-------|
| 1 | Frische Instanz starten und den Katalog öffnen | „Alle Mitglieder“ ist vorhanden, leer und als „Automatisch“ markiert | FR-001, FR-012 |
| 2 | Die Gruppe umbenennen oder löschen wollen, eine Vorlage zuordnen | Aktionen fehlen in der UI, die API antwortet 409 `catalog-item-managed` | FR-004 |
| 3 | Zwei Einladungen annehmen, dann einen Poll aus der Gruppe anlegen | Zwei Optionen mit den Identitäten | FR-002, FR-005 |
| 4 | Den Poll veröffentlichen, eine Stimme abgeben, eine dritte Einladung annehmen | Dritte Option am Ende, Stimme unverändert, Prüfprotokoll zeigt „Option ergänzt“ | FR-006, FR-008, FR-010 |
| 5 | Einen Entwurf aus der Gruppe und einen Poll aus einer manuellen Gruppe anlegen, dann eine weitere Einladung annehmen | Der Entwurf wächst, der manuelle Poll bleibt gleich | FR-006, FR-007 |
| 6 | Einen Poll aus der Gruppe ablaufen lassen oder archivieren, dann eine Einladung annehmen | Optionen unverändert | FR-007 |
| 7 | Eine Bestandsdatenbank mit Konten auf V9 migrieren | Die Gruppe enthält alle bestehenden Identitäten, alte Polls folgen nicht | R4 |
