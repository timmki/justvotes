# Research: UX-Nacharbeiten aus der Design-Kritik

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Alle Punkte des Technical Context waren aus dem bestehenden Code bestimmbar; es gab keine offenen
`NEEDS CLARIFICATION`. Die folgenden Entscheidungen halten fest, wie die Spec im vorhandenen
Frontend umgesetzt wird.

## R1 – Seitentitel je Administrationsbereich

- **Decision**: `AdminPage` leitet aus dem Abschnitt (`votes`, `polls`, `groups`, `templates`,
  `accounts`, `invitations`) Titel- und Untertitelschlüssel ab und übergibt sie an `PageFrame`.
  Die bisherigen Abschnittsüberschriften (`<h3>` „Stimmen“, „Konten“ …) in den Panels entfallen;
  Unterabschnitte innerhalb eines Bereichs (z. B. „Person einladen“, „Aus Datei einladen“) werden
  zu `<h2>`. Der Schlüssel `common.adminDescription` entfällt, neue Schlüssel
  `admin.sectionDescription.<abschnitt>` kommen hinzu.
- **Rationale**: `PageFrame` rendert die H1 bereits für alle Seiten; die Änderung bleibt in einer
  Datei pro Bereich und folgt dem Muster der User-Seiten.
- **Alternatives considered**: Eigene Routenkomponenten je Bereich – mehr Umbau ohne Mehrwert,
  da `AdminPage` die Bereichsauswahl schon zentral kapselt.

## R2 – Kopfzeilenpfad und Dokumenttitel

- **Decision**: Die bestehende `routeContext`-Funktion in `app/Header.tsx` liefert für
  `/admin/*` den Pfad „Administration › Bereich“ (Elternelement als Text, nicht als Link, da
  „Administration“ keine eigene Seite ist). Ein kleiner Hook `useDocumentTitle(title)` in
  `shared/ui/` wird von `PageFrame` aufgerufen und setzt `"<Titel> · JustVotes"`; beim Unmount wird
  der App-Name wiederhergestellt.
- **Rationale**: Ein Ort für alle Seiten deckt FR-005 ohne Änderungen in jeder Seite ab.
- **Alternatives considered**: Eine Bibliothek für Head-Management – unnötige neue
  Abhängigkeit (Constitution: keine unnötigen Abhängigkeiten).

## R3 – Nicht aktive Abstimmung

- **Decision**: `PollDetail` verzweigt nach `poll.state === 'active'`. Für nicht aktive
  Abstimmungen rendert es statt des Formulars:
  1. eine neue Komponente `PollClosedNotice` direkt am Anfang der Karte mit Grund
     (`expired` → „abgelaufen“, `archived` → „archiviert“, übrige Nicht-aktiv-Zustände mit dem
     bestehenden Statusnamen) und – wenn die Ergebnisse geladen werden konnten – einem
     Primär-Link „Ergebnisse ansehen“; sonst dem Text „Die Ergebnisse sind noch nicht freigegeben.“
  2. eine schreibgeschützte Liste `<ul>` mit Überschrift „Optionen“, ohne Auswahlkreise, mit
     Markierung „Eigene Stimme“ (gleiche Logik `currentOptionNumberFromResults`).
  Der bisherige Hinweis `polls.voteUnavailable` unter dem Formular entfällt für diesen Fall.
- **Rationale**: Ein gesperrtes `fieldset` vermittelt Bedienbarkeit, die es nicht gibt, und
  dämpft den Kontrast unter 4,5:1. Die Ergebnisverfügbarkeit ist über die vorhandene
  `usePollResultsQuery` bereits bekannt (`resultsLinkAvailable`).
- **Alternatives considered**: Formular nur einklappen – lässt das Missverständnis bestehen;
  automatische Weiterleitung zur Ergebnisseite – verhindert den Zugriff auf Metadaten und
  Prüfprotokoll und überrascht über geteilte Links.
- **Edge case**: Läuft die Abstimmung während der Ansicht ab, liefert der bestehende Fehler beim
  Absenden die Meldung; zusätzlich wird bei diesem Fehlercode die Poll-Abfrage invalidiert, sodass
  die Seite in die geschlossene Darstellung wechselt.

## R4 – Kompakte Administrations-Abstimmungsliste

- **Decision**: Aufklappbare Zeilen mit einem Button-Disclosure (`<button aria-expanded
  aria-controls>`) im Kopf jeder Abstimmung. Der Zustand „aufgeklappt“ liegt als lokaler UI-Zustand
  (`Set<pollId>`) in `AdminPolls`, nicht in der Karte, damit er Cache-Aktualisierungen übersteht
  und eine neu angelegte Abstimmung aufgeklappt werden kann. Die Kopfzeile zeigt Titel,
  Sichtbarkeit, Status, Ablauf und `totalVotes` (bereits im Schema `Poll` vorhanden). Optionslisten
  mit mehr als zehn Einträgen zeigen zunächst zehn und einen Button „Alle N Optionen anzeigen“.
  „Abstimmung erstellen“ wird zu einem per „Neue Abstimmung“ geöffneten Panel oberhalb der Liste
  (gleiche Komponente `CreatePoll`, erweitert um `onCreated(poll)` und `onCancel`); offene Eingaben
  bleiben erhalten, solange das Panel geöffnet ist.
- **Rationale**: Ein gesteuerter Disclosure-Button erlaubt einheitliches Styling und
  programmatisches Öffnen; `totalVotes` macht keinen Vertragswechsel nötig.
- **Alternatives considered**: Natives `<details>` – kann nicht zuverlässig von außen geöffnet
  werden, ohne den Zustand zu duplizieren; eigene Detailseite pro Abstimmung – neue Route, in
  der Spec ausdrücklich verworfen.
- **Open check**: Ob `apiClient.createPoll` die angelegte Abstimmung zurückgibt, wird bei der
  Umsetzung geprüft; falls nicht, wird nach dem Invalidieren die neueste Abstimmung mit passendem
  Titel aufgeklappt.

## R5 – Einheitliche Formulare

- **Decision**: Neue Komponente `FormField` in `shared/ui/` (Label über dem Feld, optionaler
  Hinweis, Fehlermeldung mit `aria-describedby` und `aria-invalid`). Die Formular-CSS-Klassen
  (`login-form`, `catalog-form`, `expiry-form`, Inline-Umbenennen) werden auf eine gemeinsame
  Feld- und Label-Darstellung zurückgeführt; Textareas erben die Fließtextschrift auch im
  Placeholder. Primärbuttons werden nur noch während des Absendens gesperrt; Pflichtfeldprüfung
  erfolgt beim Absenden (Fokus auf erstes fehlerhaftes Feld). Betroffen: Login, Passwort ändern,
  Einladung annehmen, Abstimmung erstellen, Ablauf ändern/Veröffentlichen, Vorlagengruppe
  anlegen/umbenennen, Optionsvorlage anlegen/importieren, Person einladen, Stimme entfernen
  (Begründung).
- **Rationale**: Ein gemeinsames Feld beseitigt die beobachteten Unterschiede an der Quelle und
  erfüllt die Constitution-Vorgabe zugänglicher Formulare.
- **Alternatives considered**: Nur CSS vereinheitlichen – behebt fehlende Labels und
  Fehlerzuordnung nicht.
- **Note**: Auswahlfelder ohne Pflichtcharakter (Filter, Sortierung) bleiben sofort wirksam.

## R6 – Begriffe, gefährliche Aktionen und Bestätigungen

- **Decision**: Übersetzungen werden in `shared/i18n/translations.ts` (de/en) angepasst:
  `softDelete` → „Löschen“/„Delete“, `permanentDelete` → „Endgültig löschen“/„Delete
  permanently“, Filterlabel ohne „Glob“ plus Hinweis „* steht für beliebige Zeichen“, Profil-
  Spalten „Status“ und „Abgestimmt am“. Bestätigungstexte erhalten Platzhalter (`{title}`,
  `{name}`, `{count}`), die wie bereits bei Konten und Einladungen per `replace` gefüllt werden.
  Gefährliche Aktionen stehen in einer eigenen Gruppe `.action-group-danger` am Ende der
  Aktionsleiste (abgesetzt durch Abstand und Trennlinie), mit Lösch-Icon und rotem Rahmen.
- **Rationale**: Bestehende `window.confirm`-Abfragen bleiben (Spec-Annahme); nur Text und
  Anordnung ändern sich. Interne Bezeichner (`softDelete`) bleiben, da sie nicht sichtbar sind.
- **Alternatives considered**: Eigener Bestätigungsdialog – größerer Umbau, nicht Teil der
  Kritikbefunde.

## R7 – Kleine Korrekturen auf den User-Seiten

- **Decision**: Startseite: Überschrift vor der Erklärung, „Alle Abstimmungen anzeigen“ nur
  unter „Neueste öffentliche Abstimmungen“. `PublicPollCard`: Datum mit Präfix „Erstellt“, bzw.
  „Endet“/„Endete“, je nachdem welches Datum die Karte zeigt. Ergebnisseite: Optionsname als
  Text, zusätzlicher Link „Stimmen ansehen“ zur bestehenden Optionsroute nur bei
  `votes > 0`. Kennzahl-Kachel-Labels mindestens 14 px. Profil-Zeitpunkte über das gemeinsame
  `formatTimestamp`.
- **Rationale**: Reine Darstellungsänderungen mit vorhandenen Daten und Routen.

## R8 – Kartenverschachtelung

- **Decision**: In Administrationsbereichen bleibt nur die äußere Karte (`admin-panel`);
  innere Formular- und Listenkarten (`catalog-form`, `poll-admin-card`-Inhalte,
  `invitation`-Unterbereiche) verlieren Rahmen und Schatten und werden durch `<h2>`,
  Abstände und Trennlinien gegliedert. Die einzelnen Abstimmungen in der Liste sind Zeilen mit
  Trennlinie, keine Karten.

## R9 – Tests

- **Decision**: Vitest-Komponententests für die geänderten Komponenten (Seitentitel je
  Abschnitt, geschlossene Abstimmung, Disclosure, Formularvalidierung beim Absenden, neue
  Beschriftungen und Bestätigungstexte). Bestehende Tests mit alten Beschriftungen (z. B.
  `AdminPage.test.tsx`: „Soft löschen“, „Vorlagen filtern (Glob)“) werden angepasst. Playwright:
  ein neuer Spec `ux-critique.spec.ts` prüft Seitentitel, geschlossene Abstimmung ohne Scrollen
  bei 1280×860 und 375×812 und führt `@axe-core/playwright` auf Login, einem Admin-Bereich, der
  Abstimmungs- und der Ergebnisseite aus.
- **Rationale**: Constitution V verlangt Tests der öffentlichen Wirkung; axe ist bereits
  Projektabhängigkeit.
