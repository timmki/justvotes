---

description: "Task list for UX-Nacharbeiten aus der Design-Kritik"
---

# Tasks: UX-Nacharbeiten aus der Design-Kritik

**Input**: Design documents from `specs/009-ux-critique-followup/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/ui-contract.md](contracts/ui-contract.md), [quickstart.md](quickstart.md)

**Tests**: Enthalten. Constitution V verlangt Tests für jede Verhaltensänderung (Vitest-Komponententests je Story, Playwright mit axe im Abschluss).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US6)
- Alle Pfade relativ zum Repository-Root; Frontend unter `frontend/`

## Verbindliche Konventionen für alle Tasks

- Keine Ternaries (`a ? b : c`) in handgeschriebenem TS/TSX, auch nicht in Tests; `if`/`else`, frühe Returns oder `&&`-JSX verwenden (`docs/development/frontend.md`).
- Jeder sichtbare Text als Schlüssel in `frontend/src/shared/i18n/translations.ts` in **beiden** Sprachblöcken (`de` ab Zeile 4, `en` ab Zeile 413); Texte wörtlich aus [contracts/ui-contract.md](contracts/ui-contract.md).
- Generierten Client `frontend/src/shared/api/generated/justvotes.ts` nicht anfassen; keine neuen npm-Abhängigkeiten.
- Prüfen nach jeder Phase: `cd frontend && pnpm typecheck && pnpm lint && pnpm test`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Ausgangszustand absichern

- [X] T001 Ausgangszustand prüfen: `cd frontend && pnpm install && pnpm typecheck && pnpm lint && pnpm test` ausführen und Fehler, die schon vor dieser Feature bestehen, in `specs/009-ux-critique-followup/tasks.md` unter „Notes“ festhalten

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Gemeinsame Bausteine, die mehrere Stories nutzen

**⚠️ CRITICAL**: Abschließen, bevor US3, US4 und US5 beginnen; US1, US2 und US6 brauchen nur T002/T003 bzw. T006.

- [X] T002 [P] Hook `useDocumentTitle(title: string)` in `frontend/src/shared/ui/useDocumentTitle.ts` anlegen: setzt `document.title = \`${title} · ${getAppName()}\`` (Import aus `frontend/src/shared/config/appConfig`), stellt beim Unmount `getAppName()` wieder her; Unit-Test in `frontend/src/shared/ui/useDocumentTitle.test.tsx`
- [X] T003 `PageFrame` in `frontend/src/shared/ui/PageFrame.tsx` ruft `useDocumentTitle(title)` auf (gilt damit für alle Seiten, FR-005)
- [X] T004 [P] Komponente `FormField` in `frontend/src/shared/ui/FormField.tsx` anlegen: Props `id`, `label`, `hint?`, `error?: string | null`, `children` (das Steuerelement); rendert `<label htmlFor={id}>` über dem Feld, optional `<p id={id}-hint>`, bei Fehler `<p id={id}-error className="field-error">`; klont das Kind mit `aria-invalid="true"` und `aria-describedby` (Hint- und Error-ID, nur wenn vorhanden). Tests in `frontend/src/shared/ui/FormField.test.tsx` (Label verknüpft, aria-Attribute nur bei Fehler, Hinweis verknüpft)
- [X] T005 [P] Hilfsfunktion `focusFirstInvalid(form: HTMLFormElement)` in `frontend/src/shared/ui/formValidation.ts` anlegen (fokussiert das erste Element mit `aria-invalid="true"`) plus Test in `frontend/src/shared/ui/formValidation.test.ts`
- [X] T006 [P] Gemeinsame Formular- und Aktions-Styles in `frontend/src/app/styles.css`: eine Regel für `label` in `.login-form`, `.catalog-form`, `.expiry-form`, `.form-field` (gleiche Größe/Stärke wie heute bei „Abstimmungs-Titel“); einheitliche Höhe, Schrift und Rahmen für `input:not([type=checkbox]):not([type=radio])`, `select`; `textarea` und `textarea::placeholder` mit `font: inherit`; `.field-error`, `.field-hint`; `.action-group-danger` (eigene Zeile bzw. `margin-inline-start: auto`, Trennlinie `border-top` auf schmalen Bildschirmen, rote Rahmenfarbe, Platz für Icon) – nur Klassen anlegen, Komponenten folgen in den Stories
- [X] T007 [P] Icon `TrashIcon` in `frontend/src/shared/ui/Icons.tsx` im Stil der vorhandenen Icons ergänzen (`aria-hidden`)
- [X] T008 [P] Gemeinsame Übersetzungsschlüssel in `frontend/src/shared/i18n/translations.ts` (de/en): `forms.requiredField` „Bitte fülle dieses Feld aus.“ / „Please fill in this field.“, `forms.optionalSuffix` „(optional)“ / „(optional)“ (`forms.cancel` existiert bereits und wird wiederverwendet)

**Checkpoint**: `pnpm typecheck && pnpm test` grün; neue Bausteine noch ohne sichtbare Wirkung außer Tab-Titel.

---

## Phase 3: User Story 1 – Jeder Administrationsbereich nennt sich selbst (Priority: P1) 🎯 MVP

**Goal**: H1, Untertitel, Kopfzeilenpfad und Tab-Titel nennen den jeweiligen Administrationsbereich (FR-001–FR-005).

**Independent Test**: Als Administrator alle sechs Bereiche öffnen; H1 = Navigationseintrag, eigener Untertitel, Kopfzeile „Administration › …“, Tab „… · JustVotes“, kein doppelter Kartentitel.

### Tests for User Story 1

- [X] T009 [P] [US1] In `frontend/src/features/admin/AdminPage.test.tsx` je Pfad `/admin/votes|polls|groups|templates|accounts|invitations` prüfen: `getByRole('heading', {level: 1})` hat den Bereichsnamen, Untertitel laut [ui-contract §1](contracts/ui-contract.md), Text „Anmeldung und Verwaltung.“ fehlt, keine weitere Überschrift mit dem Bereichsnamen, `document.title` = „<Bereich> · JustVotes“
- [X] T010 [P] [US1] In `frontend/src/app/App.test.tsx` (oder vorhandenem Header-Test) prüfen, dass die Kopfzeile auf `/admin/accounts` „Administration“ und „Konten“ als Pfad zeigt

### Implementation for User Story 1

- [X] T011 [US1] Übersetzungen in `frontend/src/shared/i18n/translations.ts` (de/en): `admin.sectionDescription.votes|polls|groups|templates|accounts|invitations` mit den Texten aus [ui-contract §1](contracts/ui-contract.md); `common.adminDescription` und seine Verwendungen entfernen
- [X] T012 [US1] `frontend/src/features/admin/AdminPage.tsx`: Funktion `sectionTitleKey(section)` → `admin.votes` … `admin.invitations` und `sectionDescriptionKey(section)`; `PageFrame` mit diesen Werten statt `admin.title`/`common.adminDescription` aufrufen (Fallback `votes` wie heute)
- [X] T013 [P] [US1] Doppelte Bereichsüberschriften entfernen: `<h3>{t('admin.accounts')}</h3>` in `frontend/src/features/admin/AccountAdministration.tsx:52`, `<h3>{t('admin.votes')}</h3>` in `frontend/src/features/admin/AdministrativeVotes.tsx:123`, `<h3>{t('admin.invitations')}</h3>` in `frontend/src/features/admin/InvitationAdministration.tsx:75`, `<h3>{t('admin.templates')}</h3>` und `<h3>{t('admin.groups')}</h3>` in `frontend/src/features/admin/TemplateCatalog.tsx:163,402`, `<h3>{t('admin.polls')}</h3>` in `frontend/src/features/admin/PollAdministration.tsx:48`; verbleibende Unterabschnittsüberschriften (z. B. „Person einladen“, „Aus Datei einladen“, „Mitgliedschaften“, „Abstimmung erstellen“) auf `<h2>` anheben und, wo die Section nur über die entfernte Überschrift benannt war, `aria-labelledby` auf die neue Überschrift bzw. `aria-label` umstellen
- [X] T014 [US1] `frontend/src/app/Header.tsx`: `routeKind` liefert für `/admin/*` zusätzlich `section`; `routeContext` gibt für `admin` den Elterntext „Administration“ (`t('admin.title')`) ohne Link zurück und `pageTitle` den Bereichsnamen; die Darstellung im Kopf nutzt dieselbe Breadcrumb-Optik wie bei User-Seiten, aber als `<span>` statt Link (Typ von `routeContext` um `to?: string` erweitern)
- [X] T015 [US1] CSS in `frontend/src/app/styles.css` für den nicht verlinkten Breadcrumb-Elternteil (gleiche Farbe/Größe wie der Link, ohne Unterstreichung, ohne Chevron-Link-Hover)

**Checkpoint**: T009/T010 grün; Szenario 1 aus [quickstart.md](quickstart.md) erfüllt.

---

## Phase 4: User Story 2 – Nicht aktive Abstimmung zeigt zuerst das Ergebnis (Priority: P1)

**Goal**: Abgelaufene/archivierte Abstimmungen zeigen oben Hinweis + „Ergebnisse ansehen“ und darunter eine lesbare Optionsliste ohne Formular (FR-006–FR-009).

**Independent Test**: Abgelaufene Abstimmung mit 25 Optionen bei 1280×860 und 375×812 öffnen; Hinweis und Ergebnisaktion ohne Scrollen sichtbar, eigene Stimme markiert, keine Auswahlkreise.

### Tests for User Story 2

- [X] T016 [P] [US2] In `frontend/src/features/polls/PollPage.test.tsx`: (a) `expired` + Ergebnisse geladen → Text „Diese Abstimmung ist abgelaufen. Eine Stimmabgabe ist nicht mehr möglich.“ und Link „Ergebnisse ansehen“ auf `/poll/results/:id` stehen im DOM vor der Überschrift „Optionen“; keine `radio`-Rolle, keine Legende „Stimme abgeben“; (b) `archived` → Hinweis mit „archiviert“; (c) Ergebnisse `results-unavailable` → „Die Ergebnisse sind noch nicht freigegeben.“ und kein Ergebnislink; (d) eigene Stimme vorhanden → Option enthält „Eigene Stimme“; (e) `active` → bestehende Radiogruppe unverändert; (f) `active`, Stimmabgabe schlägt mit Problem-Code `poll-not-active` (HTTP 409) fehl → Fehlermeldung an der Option und `queryKeys.poll(id)` wird invalidiert (Folgeabfrage liefert `expired` → geschlossene Darstellung)

### Implementation for User Story 2

- [X] T017 [US2] Übersetzungen (de/en) in `frontend/src/shared/i18n/translations.ts`: `polls.closedExpired`, `polls.closedArchived`, `polls.closedOther` („Diese Abstimmung ist nicht aktiv. …“ / „This poll is not active. …“), `polls.viewResults` „Ergebnisse ansehen“ / „View results“, `polls.resultsNotReleased` „Die Ergebnisse sind noch nicht freigegeben.“ / „Results have not been released yet.“, `polls.options` „Optionen“ / „Options“ – Texte laut [ui-contract §2](contracts/ui-contract.md)
- [X] T018 [P] [US2] Neue Komponente `PollClosedNotice` in `frontend/src/features/polls/PollClosedNotice.tsx`: Props `poll: Poll`, `resultsAvailable: boolean`, `resultsPending: boolean`, `pollId`; wählt Text nach `poll.state` (`expired` → `polls.closedExpired`, `archived` → `polls.closedArchived`, sonst `polls.closedOther`); bei `resultsAvailable` ein `<Link className="primary-button">` „Ergebnisse ansehen“, bei `resultsPending` den bestehenden Text `polls.resultsLoading`, sonst `polls.resultsNotReleased`
- [X] T019 [P] [US2] Neue Komponente `ClosedOptionList` in `frontend/src/features/polls/PollClosedNotice.tsx` (gleiche Datei): `<section aria-labelledby>` mit `<h2>` „Optionen“ und `<ul>` der nach `locale` sortierten Optionen; Option mit `currentOptionNumber` erhält Zusatz „Eigene Stimme“ (bestehender Schlüssel aus `PollOptionRow`) und Hervorhebungsklasse
- [X] T020 [US2] `frontend/src/features/polls/PollPage.tsx` `PollDetail`: wenn `poll.state !== 'active'`, statt `<form>…<fieldset>` zuerst `PollClosedNotice` (mit `resultsLinkAvailable`, `resultsQuery.isPending`), dann `ClosedOptionList` rendern; den bisherigen Absatz `polls.voteUnavailable` (Zeile ~126) und den Ergebnislink in `poll-detail-links` für diesen Fall entfernen (Prüfprotokoll-Link bleibt); `ResultsState` nicht zusätzlich anzeigen, wenn die Notice den Ergebnisstatus schon nennt
- [X] T021 [US2] Im `onError` von `useCastVoteMutation` in `frontend/src/features/polls/PollPage.tsx`: wenn `cause instanceof ApiError && cause.frontend.code === 'poll-not-active'` (Backend: HTTP 409 aus `PollNotActiveException`, siehe research R3), zusätzlich `queryClient.invalidateQueries({queryKey: queryKeys.poll(poll.id)})` aufrufen, damit die Seite in die geschlossene Darstellung wechselt; bestehende Fehlermeldung an der Option bleibt
- [X] T022 [US2] Styles in `frontend/src/app/styles.css`: `.poll-closed-notice` (Hinweisfläche mit Akzentrand, Abstand nach unten), `.closed-option-list` (Zeilen mit normaler Textfarbe, Kontrast ≥ 4,5:1, keine reduzierte Deckkraft), Hervorhebung der eigenen Stimme wie `.poll-option-row.current`

**Checkpoint**: T016 grün; Szenario 2 aus [quickstart.md](quickstart.md) erfüllt.

---

## Phase 5: User Story 3 – Kompakte Abstimmungsliste in der Administration (Priority: P2)

**Goal**: Zugeklappte Zeilen mit Kerndaten, Aufklappen per Disclosure, „Neue Abstimmung“ statt dauerhaftem Formular (FR-010–FR-015).

**Independent Test**: Drei Abstimmungen ohne Scrollen sichtbar bei 1280×860; aufklappen, Aktion ausführen (bleibt aufgeklappt), neue Abstimmung anlegen (wird aufgeklappt).

**Depends on**: T006, T007 (Danger-Gruppe), T004 (FormField im Anlegen-Formular)

### Tests for User Story 3

- [X] T023 [P] [US3] In `frontend/src/features/admin/AdminPage.test.tsx` (Bereich Abstimmungen): (a) alle Abstimmungen zugeklappt, Disclosure-Button mit Namen = Titel und `aria-expanded="false"`; Metazeile enthält Sichtbarkeit, Status, Ablauf bzw. „kein Ablauf gesetzt“ und Stimmenzahl aus `totalVotes`; (b) Klick/Enter → `aria-expanded="true"`, Optionen, Aktionen und Links sichtbar; (c) Abstimmung mit 12 Optionen zeigt 10 und Button „Alle 12 Optionen anzeigen“; (d) nach Aktion „Archivieren“ bleibt die Abstimmung aufgeklappt; (e) „Neue Abstimmung“ öffnet Formular mit Fokus im Titelfeld, „Abbrechen“ schließt und fokussiert „Neue Abstimmung“; (f) Speichern schließt das Formular und klappt die zurückgegebene Abstimmung auf; (g) leere Liste zeigt „Noch keine Abstimmungen.“ und „Neue Abstimmung“. Bestehende Tests, die das dauerhafte Formular oder ausgeklappte Karten erwarten, an das Aufklappen anpassen

### Implementation for User Story 3

- [X] T024 [US3] Übersetzungen (de/en): `admin.newPoll` „Neue Abstimmung“ / „New poll“, `admin.showAllOptions` „Alle {count} Optionen anzeigen“ / „Show all {count} options“, `admin.noPolls` „Noch keine Abstimmungen.“ / „No polls yet.“, `admin.expiresAt` „Ablauf {date}“ / „Expires {date}“ in `frontend/src/shared/i18n/translations.ts`
- [X] T025 [US3] `frontend/src/features/admin/PollAdministration.tsx` `AdminPolls`: lokaler Zustand `expandedPollIds: Set<string>` und `createOpen: boolean` (siehe [data-model.md](data-model.md) „AdminPollListState“); Seitenkopf mit Button `primary-button` „Neue Abstimmung“ (Ref für Fokusrückgabe); `CreatePoll` nur bei `createOpen` rendern; Leerzustand mit `admin.noPolls`; Liste als `<ul className="poll-admin-list">` mit Zeilen statt Karten
- [X] T026 [US3] `PollAdministrationCard` → Zeile mit Kopf: `<h3><button type="button" aria-expanded aria-controls={\`poll-admin-body-${poll.id}\`}>` mit Titel und Chevron-Icon; Metazeile `öffentlich · abgelaufen · Ablauf … · N Stimmen` (Stimmenzahl über `formatVoteCount` aus `frontend/src/features/polls/pollFormatters.ts`); Körper (`id=poll-admin-body-…`, `hidden` wenn zugeklappt) enthält Optionen, Aktionen, Fehler und Links wie bisher; `expanded`/`onToggle` als Props von `AdminPolls`
- [X] T027 [US3] Optionsliste im Körper (`frontend/src/features/admin/PollAdministration.tsx`): bei mehr als 10 Optionen nur die ersten 10 plus Button „Alle N Optionen anzeigen“ (lokaler Zustand je Karte); Bearbeitungsformular für Entwürfe unverändert
- [X] T028 [US3] `CreatePoll` in `PollAdministration.tsx`: Props `onCreated(poll: Poll)` und `onCancel()`; Erfolg nutzt das von `apiClient.createPoll` zurückgegebene `Poll` (`frontend/src/shared/api/client.ts:217`) → `onCreated(poll)` (ID in `expandedPollIds`, `createOpen=false`) statt `navigate('/admin/polls')`; Button „Abbrechen“ (`text-button`); beim Mount Fokus ins Titelfeld; Eingaben bleiben erhalten, solange das Panel offen ist; Überschrift „Neue Abstimmung“ als `<h2>`. Route `/admin/create` öffnet weiterhin den Bereich Abstimmungen mit `createOpen=true`
- [X] T029 [US3] Endgültiges Löschen entfernt die ID aus `expandedPollIds` (im `onSuccess`-Zweig ohne `updated`)
- [X] T030 [US3] Styles in `frontend/src/app/styles.css`: `.poll-admin-row` (Trennlinie statt Karte, Kopf als volle Breite klickbarer Button mit sichtbarem Fokus, Chevron dreht bei `aria-expanded="true"`), Metazeile, `.poll-admin-body`; lange Titel brechen um (`overflow-wrap: anywhere`); kein horizontales Scrollen bei 375 px

**Checkpoint**: T023 grün; Szenarien 3 und 4 aus [quickstart.md](quickstart.md) erfüllt.

---

## Phase 6: User Story 4 – Einheitliche Formulare und klare Primäraktionen (Priority: P2)

**Goal**: Alle Formulare nutzen `FormField`, haben sichtbare Labels, eine gefüllte Primäraktion und validieren beim Absenden (FR-016–FR-021).

**Independent Test**: Jedes in [quickstart.md](quickstart.md) Szenario 6 genannte Formular leer absenden → Feldfehler, Fokus aufs erste Feld, keine Anfrage; optisch identische Labels und Felder.

**Depends on**: T004, T005, T006, T008

**Ausnahme (research R5, ui-contract §4)**: Die Stimmabgabe auf der Abstimmungsseite ist kein Eingabeformular. „Stimme abgeben“ bleibt wie in Spec 004/005 nur auslösbar, wenn eine von der aktuellen Stimme abweichende Option markiert ist – keine Task dieser Phase ändert `submitEnabled` in `PollPage.tsx`.

### Tests for User Story 4

- [X] T031 [P] [US4] `frontend/src/features/auth/LoginPage.test.tsx`: Button „Anmelden“ ist bei leeren Feldern nicht `disabled`; Absenden ohne Eingaben ruft `apiClient.login` nicht auf, zeigt „Bitte fülle dieses Feld aus.“ an E-Mail und Passwort (`aria-invalid`, `aria-describedby`), Fokus auf E-Mail; während des Sendens `disabled` + `aria-busy`
- [X] T032 [P] [US4] `frontend/src/features/auth/PasswordChangePage.test.tsx` und `frontend/src/features/auth/InvitationPage.test.tsx`: gleiche Prüfungen für deren Pflichtfelder (Primärbutton nicht vorab gesperrt, Feldfehler beim Absenden)
- [X] T033 [P] [US4] `frontend/src/features/admin/AdminPage.test.tsx`: „Neue Vorlagengruppe“ hat Felder mit Labels „Name“ und „Beschreibung (optional)“; leeres Absenden von „Gruppe anlegen“, „Vorlage anlegen“, „Einladen“ und „Speichern“ (Neue Abstimmung) zeigt Feldfehler statt gesperrtem Button; Ablaufformular zeigt bei Vergangenheitsdatum die bestehende Meldung `admin.invalidExpiry` am Feld
- [X] T034 [P] [US4] `frontend/src/features/polls/PollPage.test.tsx`: (a) Regressionstest für die Ausnahme – ist die eigene Stimme markiert oder nichts gewählt, ist „Stimme abgeben“ nicht vorhanden bzw. nicht auslösbar; (b) Optionszeile trägt die Container-Klasse mit Abstand zwischen Radio und Text (der sichtbare Abstand wird in T064 manuell geprüft)

### Implementation for User Story 4

- [X] T035 [P] [US4] `frontend/src/features/auth/LoginPage.tsx`: Felder in `FormField`; `disabled` nur noch bei `pending` (Zeile ~53); Pflichtfeldprüfung in `submit` mit `forms.requiredField`, danach `focusFirstInvalid`; native `required` beibehalten, aber Formular mit `noValidate`, damit die eigene Meldung erscheint
- [X] T036 [P] [US4] `frontend/src/features/auth/PasswordChangePage.tsx` und `frontend/src/features/auth/InvitationPage.tsx`: gleiche Umstellung auf `FormField`, Primärbutton nur während `pending` gesperrt, Feldfehler beim Absenden
- [X] T037 [US4] `frontend/src/features/admin/PollAdministration.tsx`: `CreatePoll` (Felder „Titel“, „Vorlagengruppe“) und `ExpiryForm` auf `FormField`; Primärbutton nur bei `isPending` gesperrt; fehlende Gruppe/Titel → Feldfehler; ungültiges Datum → `admin.invalidExpiry` als Feldfehler; Hinweis `admin.noNonEmptyGroups` bleibt
- [X] T038 [US4] `frontend/src/features/admin/TemplateCatalog.tsx`: „Neue Vorlagengruppe“ mit `FormField` „Name“ und „Beschreibung (optional)“ (Schlüssel `admin.groupName`, `admin.groupDescription` + `forms.optionalSuffix`), „Gruppe umbenennen“ als `FormField` mit voller Feldhöhe, „Neue Optionsvorlage“ und „Mehrere Vorlagen (kommagetrennt)“ mit `FormField`; Primärbuttons nicht vorab gesperrt; „Importieren“ als einzige Primäraktion des Importformulars gefüllt darstellen, „Vorlage anlegen“ im eigenen Formular
- [X] T039 [P] [US4] `frontend/src/features/admin/InvitationAdministration.tsx` und `frontend/src/features/admin/ContactImport.tsx`: Felder auf `FormField`, Primärbutton „Einladen“ nicht vorab gesperrt, Feldfehler bei leerer/ungültiger E-Mail (bestehender Schlüssel `admin.invalidEmail`)
- [X] T040 [P] [US4] `frontend/src/features/admin/AdministrativeVotes.tsx` `VoteRemovalDialog`: Begründungsfeld mit `FormField`; Button „Stimme entfernen“ nur bei `pending` gesperrt, leere Begründung → Feldfehler; Suchfeld und Filter bleiben sofort wirksam, erhalten aber `FormField`-Labels
- [X] T041 [P] [US4] `frontend/src/features/polls/PollOptionRow.tsx` + `frontend/src/app/styles.css`: sichtbarer Abstand (`gap`) zwischen Auswahlkreis und Optionstext
- [X] T042 [US4] Aufräumen in `frontend/src/app/styles.css`: abweichende Label-/Feldregeln (z. B. kleinere Inline-Felder bei „Gruppe umbenennen“, Monospace-Placeholder) entfernen, sodass nur die gemeinsamen Regeln aus T006 gelten; Primärbutton-Darstellung `:disabled` nur noch für den Ladezustand relevant

**Checkpoint**: T031–T034 grün; Szenarien 5 und 6 aus [quickstart.md](quickstart.md) erfüllt.

---

## Phase 7: User Story 5 – Verständliche Begriffe und abgegrenzte gefährliche Aktionen (Priority: P3)

**Goal**: Jargon ersetzt, gefährliche Aktionen abgesetzt und mit Objektnamen bestätigt (FR-022–FR-025).

**Independent Test**: Beschriftungen de/en prüfen; je eine gefährliche Aktion in Abstimmungen, Konten, Optionsvorlagen, Vorlagengruppen auslösen und abbrechen.

**Depends on**: T006, T007; für Abstimmungsaktionen sinnvollerweise nach US3 (gleiche Datei)

### Tests for User Story 5

- [X] T043 [P] [US5] `frontend/src/features/admin/AdminPage.test.tsx`: Aktionsmatrix-Test (Zeilen ~653–659) auf „Löschen“/„Endgültig löschen“ umstellen; `window.confirm` wird mit Text inkl. Abstimmungstitel aufgerufen; Endgültig löschen ruft `confirm` zweimal; Abbrechen löst keine Anfrage aus; jede Lösch-Bestätigung nennt die Umkehrbarkeit (Abstimmung „Löschen“ → „Sie kann wiederhergestellt werden.“, Vorlagengruppe „Löschen“ → „Diese Aktion kann nicht rückgängig gemacht werden.“, ui-contract §5 „Regel für Löschen“); Vorlagenfilter-Label „Vorlagen filtern“ mit Hinweis „* steht für beliebige Zeichen“; Gefahraktionen liegen in einem Element mit Klasse `action-group-danger` als letztes Kind der Aktionsleiste; Bereich Stimmen: Dialog „Stimme entfernen“ nennt im Text den Abstimmungstitel **und** die Identität der gewählten Stimme, der Auslöse-Button liegt in `action-group-danger`
- [X] T044 [P] [US5] `frontend/src/features/profile/ProfilePage.test.tsx`: Spalten „Status“ und „Abgestimmt am“, kein „UTC“; Zeitpunkt im Format von `formatTimestamp`
- [X] T045 [P] [US5] `frontend/src/features/admin/AccountAdministration.test.tsx`: „Sperren“ in `action-group-danger`; Bestätigung enthält die Konto-E-Mail (bestehend, absichern)
### Implementation for User Story 5

- [X] T046 [US5] Übersetzungen in `frontend/src/shared/i18n/translations.ts` (de/en) laut [ui-contract §5](contracts/ui-contract.md): `admin.softDelete`, `admin.permanentDelete`, `admin.searchTemplates`/`admin.filterTemplates` (ohne „Glob“) + neuer `admin.filterHint`, `profile.state` → „Status“, `profile.votedAt` → „Abgestimmt am“ / „Voted on“, `admin.confirmSoftDelete`, `admin.confirmPermanentDelete` mit `{title}`, `admin.confirmDeleteGroup` mit `{name}` und Zusatz „Diese Aktion kann nicht rückgängig gemacht werden.“ / „This cannot be undone.“, `admin.confirmDeleteTemplates` mit `{count}`, `voteAdmin.removeVoteWarning` mit `{title}` und `{identity}`; `admin.confirmPermanentDeleteAgain` bleibt
- [X] T047 [US5] `frontend/src/features/admin/PollAdministration.tsx` `requestAction`: Platzhalter `{title}` mit `poll.title` füllen; Aktionsleiste in zwei Gruppen teilen – harmlose Aktionen zuerst, `softDelete` und `permanentDelete` in `<div className="action-group-danger">` am Ende, Buttons mit `TrashIcon`
- [X] T048 [P] [US5] `frontend/src/features/admin/TemplateCatalog.tsx`: Bestätigungen mit `{name}` (aktive Gruppe, über `groupName`) bzw. `{count}` (Anzahl ausgewählter Vorlagen) füllen; „Löschen“ der Gruppe und „Ausgewählte löschen (N)“ in `action-group-danger`; Filterfeld mit Label `admin.filterTemplates` und Hinweis `admin.filterHint` über `FormField`
- [X] T049 [P] [US5] `frontend/src/features/admin/AccountAdministration.tsx`: „Sperren“ in `action-group-danger` am Ende der Zeilenaktionen; `frontend/src/features/admin/AdministrativeVotes.tsx` (nach T040, gleiche Datei): „Stimme entfernen“ in der Zeile als Gefahraktion in `action-group-danger` mit `TrashIcon`; `VoteRemovalDialog` zeigt im Text Abstimmungstitel und Identität der Stimme (Schlüssel `voteAdmin.removeVoteWarning` um `{title}` und `{identity}` erweitern, de/en); `frontend/src/features/admin/InvitationAdministration.tsx`: „Widerrufen“ als Gefahraktion
- [X] T050 [P] [US5] `frontend/src/features/profile/ProfilePage.tsx`: Spaltenbeschriftungen über die geänderten Schlüssel, Zeitpunkt über `formatTimestamp` aus `frontend/src/features/polls/pollFormatters.ts` statt UTC-Format

**Checkpoint**: T043–T045 grün; Szenario 7 aus [quickstart.md](quickstart.md) erfüllt.

---

## Phase 8: User Story 6 – Kleine Klarheitsverbesserungen auf den User-Seiten (Priority: P3)

**Goal**: Startseite, Abstimmungskarten und Ergebnisseite lesen sich eindeutig (FR-026–FR-029).

**Independent Test**: Startseite ohne aktive Abstimmung, Abstimmungsliste, Ergebnisseite einer abgelaufenen Abstimmung prüfen.

### Tests for User Story 6

- [X] T051 [P] [US6] `frontend/src/features/home/HomePage.test.tsx`: ohne aktive Abstimmung steht die Überschrift „Keine aktive Abstimmung“ im DOM vor der Erklärung; `getAllByRole('link', {name: 'Alle Abstimmungen anzeigen'})` hat Länge 1
- [X] T052 [P] [US6] `frontend/src/features/polls/PollsPage.test.tsx`: Karte zeigt „Erstellt“ bzw. „Endet“/„Endete“ vor dem Datum
- [X] T053 [P] [US6] `frontend/src/features/polls/ResultsPages.test.tsx`: Optionsname ist kein Link; Option mit `voteCount > 0` hat Link „Stimmen ansehen“ auf `/poll/results/:id/option/:n`; Option mit `voteCount === 0` hat keinen solchen Link

### Implementation for User Story 6

- [X] T054 [US6] Übersetzungen (de/en): `polls.createdPrefix` „Erstellt“ / „Created“, `polls.endsPrefix` „Endet“ / „Ends“, `polls.endedPrefix` „Endete“ / „Ended“, `polls.viewVotes` „Stimmen ansehen“ / „View votes“ in `frontend/src/shared/i18n/translations.ts`
- [X] T055 [P] [US6] `frontend/src/features/home/HomePage.tsx`: im Zustand ohne aktive Abstimmung Überschrift vor Erklärung; den Link „Alle Abstimmungen anzeigen“ im Fokusbereich entfernen, den unter „Neueste öffentliche Abstimmungen“ behalten
- [X] T056 [P] [US6] `frontend/src/features/polls/PublicPollCard.tsx`: vor dem angezeigten Datum Präfix je nach angezeigtem Wert (Erstelldatum → „Erstellt“; Ablaufdatum in der Zukunft → „Endet“, in der Vergangenheit → „Endete“), Datum weiter in `<time dateTime>`
- [X] T057 [P] [US6] `frontend/src/features/polls/ResultsPages.tsx` (Zeile ~74): Optionsname als Text; bei `option.voteCount > 0` zusätzlicher `<Link className="text-link">` „Stimmen ansehen“ mit `aria-label` „Stimmen ansehen: {Option}“ zur bestehenden Optionsroute
- [X] T058 [P] [US6] `frontend/src/app/styles.css`: Beschriftungen der Kennzahl-Kacheln auf mindestens `0.875rem` (14 px) – Startseite, Stimmen-Übersicht der Administration, Ergebnisseite (`.result-summary dt`: „Gesamtstimmen“, „Höchster Anteil“) und Optionsseite (`.option-summary dt`)

**Checkpoint**: T051–T053 grün; Szenario 9 aus [quickstart.md](quickstart.md) erfüllt.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Kartenebenen, E2E-/Barrierefreiheitsprüfung, Abschlussvalidierung

- [X] T059 Kartenverschachtelung abbauen (FR-032, research R8) in `frontend/src/app/styles.css` und betroffenen Komponenten (`InvitationAdministration.tsx`, `ContactImport.tsx`, `TemplateCatalog.tsx`, `AdministrativeVotes.tsx`): innerhalb von `.admin-panel` keine weiteren Rahmen/Schatten; Unterabschnitte durch `<h2>`, Abstand und `border-top` trennen. Zusätzlich Ergebnisseite (`frontend/src/features/polls/ResultsPages.tsx`, research R8): `.result-option` als Zeilen mit Trennlinie statt Karten, Gewinner-Option mit Akzentfläche/-rand, `.result-summary`-Kacheln flach ohne Rahmen/Schatten
- [X] T060 [P] Neuer Playwright-Spec `frontend/e2e/ux-critique.spec.ts` (Fixtures aus `frontend/e2e/fixtures/` nutzen): (a) Admin – sechs Bereiche, H1 und `page.title()`; (b) User – abgelaufene Abstimmung bei 1280×860 und 375×812, „Ergebnisse ansehen“ ist `toBeInViewport()`; (c) Admin – drei Abstimmungen zugeklappt in Viewport bei 1280×860; (d) `AxeBuilder` aus `@axe-core/playwright` auf Login, `/admin/templates`, Abstimmungsseite und Ergebnisseite ohne Verstöße der Regeln `label` und `color-contrast`
- [X] T061 [P] Bestehende E2E-Specs (`frontend/e2e/app-shell.spec.ts`, `auth.spec.ts`, `member-group.spec.ts`, `profile.spec.ts`) an geänderte Überschriften/Beschriftungen anpassen
- [X] T062 Repository-weite Suche nach entfernten Texten (`Soft löschen`, `Permanent löschen`, `Glob`, `Lebenszyklus`, `UTC`, `Anmeldung und Verwaltung`, englische Pendants) in `frontend/src` und `frontend/e2e`; Treffer außer Code-Bezeichnern beseitigen (SC-006)
- [X] T063 Vollständige Prüfung: `cd frontend && pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e`
- [X] T064 Manuelle Szenarien 1–15 aus `specs/009-ux-critique-followup/quickstart.md` im Browser (de und en, 1280 px und 375 px) durchgehen und Ergebnis unter „Notes“ festhalten

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: keine Abhängigkeiten
- **Foundational (Phase 2)**: nach Setup; T002–T003 für US1, T004–T008 für US3/US4/US5
- **US1 (Phase 3)** und **US2 (Phase 4)**: nach T002/T003 bzw. direkt nach Setup – unabhängig voneinander
- **US3 (Phase 5)**: nach Phase 2
- **US4 (Phase 6)**: nach Phase 2; T037 nach T028 (gleiche Datei, `CreatePoll`)
- **US5 (Phase 7)**: nach Phase 2; T047 nach T026 (gleiche Datei, Aktionsleiste); T048 nach T038
- **US6 (Phase 8)**: unabhängig, nur T058 berührt `styles.css`
- **Polish (Phase 9)**: nach allen gewünschten Stories

### User Story Dependencies

- **US1 (P1)**: keine Story-Abhängigkeit
- **US2 (P1)**: keine Story-Abhängigkeit
- **US3 (P2)**: nutzt Danger-Gruppe/FormField aus Phase 2, unabhängig testbar
- **US4 (P2)**: berührt `PollAdministration.tsx` nach US3; sonst unabhängig
- **US5 (P3)**: berührt Aktionsleiste aus US3 und Formulare aus US4 in `TemplateCatalog.tsx`
- **US6 (P3)**: keine Story-Abhängigkeit

### Gemeinsam berührte Dateien (nicht parallel bearbeiten)

- `frontend/src/shared/i18n/translations.ts`: T008, T011, T017, T024, T046, T054 nacheinander
- `frontend/src/app/styles.css`: T006, T015, T022, T030, T041, T042, T058, T059 nacheinander
- `frontend/src/features/admin/PollAdministration.tsx`: T013, T025–T029, T037, T047 nacheinander
- `frontend/src/features/admin/TemplateCatalog.tsx`: T013, T038, T048 nacheinander
- `frontend/src/features/admin/AdminPage.test.tsx`: T009, T023, T033, T043 nacheinander
- `frontend/src/features/admin/AdministrativeVotes.tsx`: T013, T040, T049, T059 nacheinander
- `frontend/src/features/polls/ResultsPages.tsx`: T057, T059 nacheinander
- `frontend/src/features/polls/PollPage.tsx`: T020, T021 nacheinander; `PollPage.test.tsx`: T016, T034 nacheinander

### Parallel Opportunities

- Phase 2: T002, T004, T005, T006, T007, T008 parallel
- Nach Phase 2: US1, US2 und US6 können parallel laufen (verschiedene Dateien bis auf `translations.ts`/`styles.css`)
- Innerhalb von US4: T035, T036, T039, T040, T041 parallel
- Innerhalb von US6: T055, T056, T057 parallel

---

## Parallel Example: User Story 2

```bash
# Tests und neue Komponente parallel vorbereiten:
Task: "T016 [US2] PollPage.test.tsx – geschlossene Darstellung"
Task: "T018 [US2] PollClosedNotice in frontend/src/features/polls/PollClosedNotice.tsx"
# danach T020 (PollPage.tsx), T021, T022
```

## Parallel Example: User Story 4

```bash
Task: "T035 [US4] LoginPage.tsx auf FormField"
Task: "T036 [US4] PasswordChangePage.tsx und InvitationPage.tsx auf FormField"
Task: "T039 [US4] InvitationAdministration.tsx und ContactImport.tsx auf FormField"
Task: "T040 [US4] VoteRemovalDialog auf FormField"
```

---

## Implementation Strategy

### MVP First

1. Phase 1 + T002/T003 aus Phase 2
2. Phase 3 (US1) und Phase 4 (US2) – beide P1, unabhängig
3. **STOP and VALIDATE**: Szenarien 1 und 2 aus [quickstart.md](quickstart.md)

### Incremental Delivery

1. Rest von Phase 2 → US3 → US4 (größter Umbau in der Administration)
2. US5 → US6 (überwiegend Texte und kleine Darstellungsänderungen)
3. Phase 9: Kartenebenen, E2E mit axe, manuelle Abnahme

---

## Notes

- [P] = verschiedene Dateien, keine offenen Abhängigkeiten
- `apiClient.createPoll` liefert `Poll` zurück (`frontend/src/shared/api/client.ts:217`); die Ausweichlösung aus research R4 ist nicht nötig
- Zweite Plan-Revision übernommen: T1 (Umkehrbarkeit im Bestätigungstext, T043, T046)
- Überarbeitet nach `/speckit-analyze` und Plan-Revision: H1 (Ausnahme Stimmabgabe, T034), C1 (T059 Ergebnisseite), C2 (T058), U1 (T043, T046, T049), U2 (T016, T021), P1 (Dateiliste), D1 (T008), Feld `voteCount` (T053, T057)
- `spec.md` ist nachgezogen (FR-019 nur für Eingabeformulare, US1 AS3, US5 AS4); Tasks und Spec stimmen überein
- Nach jeder Phase committen; Story-Checkpoints einzeln validieren
- Vorbestehende Testfehler (T001): keine – Typecheck, Lint und 212 Vitest-Tests waren vor Beginn grün
- Abweichung: Übersetzungsschlüssel sind zweistufig (`namespace.key`); statt `admin.sectionDescription.<abschnitt>` werden `admin.sectionDescriptionVotes` usw. verwendet
- Manuelle Abnahme (T064, 2026-11-01, Dev-Server, echte Testdaten): Szenarien 1, 2, 3, 6, 8, 10 und 13 im Browser geprüft (de/en, 1280 px und 375 px). Szenarien 4, 5, 7, 9, 11, 12 und 15 sind durch Vitest/Playwright abgedeckt; Szenario 14 (Stoppuhr, SC-004) wurde nicht gemessen
- Abweichung: Das Feld im Formular „Neue Abstimmung“ heißt weiterhin „Abstimmungs-Titel“ (ui-contract §3 angepasst)
- T063: Typecheck, Lint, 246 Vitest-Tests und Playwright grün – Chromium 78/78, Firefox/WebKit/Edge 232/234 im ersten Lauf; die 2 Firefox-Fehler (Tab-Titel der Startseite) behoben und gezielt nachgeprüft. Startseite zeigt als Tab-Titel nur den App-Namen (ui-contract §1)

---

## Phase 10: Convergence

- [X] T065 Give the inline "Vorlage umbenennen" field in the option-template list (`frontend/src/features/admin/TemplateCatalog.tsx`, rename form inside `catalog-list`) a visible `FormField` label instead of the `aria-label`-only input, and report an empty name at the field per FR-016 (partial)
- [X] T066 Move the per-row "Löschen" of each option template in `frontend/src/features/admin/TemplateCatalog.tsx` into an `action-group-danger` with `TrashIcon` at the end of the row, and give "Sperren" in `frontend/src/features/admin/AccountAdministration.tsx` an icon so it is recognisable without colour per FR-024 / US5/AC4 (partial)
- [X] T067 Move the sort, date-filter, from and to controls of `frontend/src/features/polls/PollsPage.tsx` onto `FormField` (label above, shared height, font and border) instead of the separate `filter-control` look per FR-016 / FR-017 / US4/AC3 (partial)
- [X] T068 Remove the second card level of the account and invitation tables inside `.admin-panel` at narrow widths (`.admin-card-table` rows in `frontend/src/app/styles.css`, used by `AccountAdministration.tsx` and `InvitationAdministration.tsx`): rows separated by lines instead of bordered cards per FR-032 (partial)
- [X] T069 Resolve the start-page exception to FR-005: the home tab shows only "JustVotes" (`frontend/src/shared/ui/PageFrame.tsx`, ui-contract §1) while FR-005 requires page name plus app name on all pages – either amend FR-005 in `specs/009-ux-critique-followup/spec.md` to name the start page as the exception or set "Startseite · JustVotes" and adapt `frontend/e2e/app-shell.spec.ts` title tests per FR-005 (contradicts)
- [X] T070 Keep the contact-import confirmation button in `frontend/src/features/admin/ContactImport.tsx` usable with zero selected contacts and report "select at least one contact" next to the list on click, or document why a selection count is exempt like the vote submission per FR-019 (partial)
