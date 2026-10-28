# Feature Specification: Lokale Konten mit Anmeldung und Berechtigungen

**Feature Branch**: `006-local-user-auth`

**Created**: 2026-10-27

**Status**: Draft

**Input**: User description: "Ich möchte ein Framework für die Authentfizierung und Authorisierung einbauen. Es soll möglichst lokal laufen, also kein Keycloak oder IDP oder dergleichen. Ich will lediglich die Anwendung mit lokalen Nutzern ausstatten, die eine feste Identität mit selbstverwaltenden Credentials haben,"

## Clarifications

### Session 2026-10-27

- Q: Wer legt Konten an? → A: Der Administrator lädt per E-Mail-Adresse ein;
  das System versendet automatisch eine E-Mail mit Link zur Anwendung, über
  den die Person ihr Konto selbst vervollständigt.
- Q: Wie werden bestehende, frei gewählte Identitäten behandelt? → A: Sie
  werden nicht übernommen; alle bestehenden Stimmen und zugehörigen
  Domänenereignisse werden einmalig gelöscht.
- Q: Ist eine Anmeldung verpflichtend? → A: Ja, für die gesamte Anwendung.
  Es gibt keinen anonymen Zugriff; nicht angemeldete Personen sehen nur die
  Anmeldung. Alle melden sich auf dieselbe Weise an. Der initiale
  Administrator hat die Rolle „Administrator“ und damit Zugriff auf das
  Administrationsmenü; alle anderen Konten haben die Rolle „User“ und sehen und
  nutzen nur Abstimmungen.
- Q: Ist der Administrator auch ein abstimmendes Konto? → A: Nein. Das
  Administratorkonto besitzt keine Identität und kann nicht abstimmen.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Anmelden und unter fester Identität abstimmen (Priority: P1)

Die gesamte Anwendung ist nur nach Anmeldung nutzbar. Eine nicht angemeldete
Person sieht ausschließlich die Anmeldeseite. Alle Personen, auch der
Administrator, melden sich auf dieselbe Weise mit Kontoname und Passwort an.
Jedes User-Konto besitzt genau eine feste Identität; nach der Anmeldung ist sie
automatisch die aktuelle Identität. Die Person sieht die Abstimmungen und kann
unter dieser Identität abstimmen, ohne die Identität frei wählen zu können.
Nach der Abmeldung sieht sie wieder nur die Anmeldeseite.

**Why this priority**: Heute kann jede Person anonym zugreifen und jede
beliebige Identität beanspruchen. Erst eine verpflichtende Anmeldung mit an
das Konto gebundener Identität macht Zugriff und Stimmen verlässlich
zurechenbar. Das ist der Kernnutzen der Funktion.

**Independent Test**: Ohne Anmeldung wird beim Aufruf beliebiger Seiten nur
die Anmeldeseite gezeigt. Nach der Anmeldung mit einem vorhandenen Konto kann
die Person in einem aktiven Poll abstimmen und die Stimme unter ihrer
Kontoidentität im Prüfprotokoll sehen. Nach der Abmeldung ist wieder nur die
Anmeldeseite erreichbar.

**Acceptance Scenarios**:

1. **Given** keine Anmeldung, **When** eine beliebige Seite oder Funktion der
   Anwendung aufgerufen wird, **Then** wird ausschließlich die Anmeldeseite
   angezeigt und es werden keine Polls, Stimmen oder Identitäten offengelegt.
2. **Given** ein aktives User-Konto, **When** die Person sich mit korrektem
   Kontonamen und Passwort anmeldet, **Then** ist sie angemeldet, ihre
   Kontoidentität ist die aktuelle Identität und sie sieht die Abstimmungen.
3. **Given** eine nicht angemeldete Person ruft eine bestimmte Seite auf,
   **When** sie sich anschließend anmeldet, **Then** gelangt sie zu der
   ursprünglich aufgerufenen Seite, sofern ihre Rolle diese erlaubt.
4. **Given** eine angemeldete Person, **When** sie in einem aktiven Poll eine
   Stimme abgibt, **Then** wird die Stimme ihrer Kontoidentität zugerechnet.
5. **Given** falsche Anmeldedaten, **When** die Anmeldung versucht wird,
   **Then** wird sie mit einer allgemeinen Meldung abgelehnt, die nicht
   verrät, ob der Kontoname existiert.
6. **Given** eine angemeldete Person, **When** sie sich abmeldet, **Then**
   endet die Anmeldung und sie sieht nur noch die Anmeldeseite.

---

### User Story 2 - Per Einladung ein Konto anlegen (Priority: P1)

Der Administrator lädt eine Person ein, indem er ihre E-Mail-Adresse angibt.
Das System versendet automatisch eine E-Mail mit einem persönlichen, einmalig
nutzbaren und zeitlich begrenzten Link zur Anwendung. Über diesen Link füllt
die Person ihr Konto selbst mit Leben: Sie wählt Kontoname, feste Identität
und Passwort. Das Konto erhält die Rolle „User“. Danach ist die Person
angemeldet. Die Identität ist instanzweit eindeutig und kann nach dem Anlegen
nicht mehr geändert werden. Eine Selbstregistrierung ohne Einladung gibt es
nicht.

**Why this priority**: Ohne Konten kann sich niemand außer dem Administrator
anmelden; diese Story ist Voraussetzung für die Nutzung durch alle anderen.
Die Einladung hält den Kreis der Personen kontrolliert, ohne dass der
Administrator Passwörter vergeben oder kennen muss.

**Independent Test**: Der Administrator lädt eine E-Mail-Adresse ein; die
versandte E-Mail enthält einen Link, über den ein Konto vervollständigt und
anschließend für die Anmeldung verwendet wird. Ein zweiter Aufruf desselben
Links wird abgelehnt.

**Acceptance Scenarios**:

1. **Given** der angemeldete Administrator, **When** er eine noch nicht
   eingeladene oder registrierte E-Mail-Adresse einlädt, **Then** wird
   automatisch eine Einladungs-E-Mail mit einem persönlichen Link versendet.
2. **Given** ein gültiger Einladungslink, **When** eine nicht angemeldete
   Person ihn öffnet, **Then** sieht sie die Seite zum Vervollständigen des
   Kontos statt der Anmeldeseite.
3. **Given** ein gültiger Einladungslink, **When** die Person einen noch nicht
   vergebenen Kontonamen, eine noch nicht vergebene Identität und ein gültiges
   Passwort wählt, **Then** existiert das Konto mit der Rolle „User“ und die
   Person ist angemeldet.
4. **Given** ein bereits verwendeter, abgelaufener oder widerrufener
   Einladungslink, **When** er aufgerufen wird, **Then** kann kein Konto
   angelegt werden und die Person erhält eine verständliche Meldung mit Weg
   zur Anmeldeseite.
5. **Given** eine bereits vergebene Identität oder ein bereits vergebener
   Kontoname, **When** das Konto damit vervollständigt werden soll, **Then**
   wird dies mit einer verständlichen Meldung abgelehnt und die Einladung
   bleibt gültig.
6. **Given** ein Passwort, das die Mindestanforderungen nicht erfüllt,
   **When** das Konto vervollständigt werden soll, **Then** wird dies mit
   einem Hinweis auf die Anforderungen abgelehnt.
7. **Given** eine offene Einladung, **When** der Administrator sie widerruft
   oder erneut versendet, **Then** verliert der bisherige Link seine
   Gültigkeit und bei erneutem Versand gilt nur der neue Link.

---

### User Story 3 - Berechtigungen über Rollen steuern (Priority: P1)

Es gibt zwei Rollen. Das initiale, über die Installation bereitgestellte
Administratorkonto hat die Rolle „Administrator“; nur damit ist das
Administrationsmenü sichtbar und nutzbar (Polls verwalten, Vorlagenkatalog,
Einladungen, Konten). Alle anderen Konten haben die Rolle „User“: Sie sehen
nur Abstimmungen und können diese benutzen, also lesen, abstimmen, ihre Stimme
ersetzen oder zurücknehmen, das Prüfprotokoll und die eigene Profilseite
ansehen sowie ihr eigenes Passwort ändern.

Das Administratorkonto ist kein abstimmendes Konto: Es besitzt keine
Identität, kann nicht abstimmen und hat keine persönliche Profilseite. Polls
sieht es ausschließlich über die Administration.

**Why this priority**: Autorisierung ist Teil der Anforderung; sie ersetzt
die heute getrennte Administratoranmeldung durch ein einheitliches
Kontomodell mit einer gemeinsamen Anmeldung.

**Independent Test**: Ein User-Konto sieht nach der Anmeldung kein
Administrationsmenü und erhält beim direkten Aufruf einer
Administrationsfunktion eine Zugriffsverweigerung; das Administratorkonto
sieht das Menü und kann dieselbe Funktion ausführen.

**Acceptance Scenarios**:

1. **Given** ein angemeldetes User-Konto, **When** die Anwendung angezeigt
   wird, **Then** ist das Administrationsmenü nicht sichtbar.
2. **Given** ein angemeldetes User-Konto, **When** es eine
   Administrationsfunktion direkt aufruft, **Then** wird der Zugriff
   verweigert.
3. **Given** das angemeldete Administratorkonto, **When** die Anwendung
   angezeigt wird, **Then** ist das Administrationsmenü sichtbar und seine
   Funktionen sind ausführbar.
4. **Given** das angemeldete Administratorkonto, **When** es versucht, eine
   Stimme abzugeben oder die persönliche Profilseite aufzurufen, **Then** wird
   dies verweigert, und es werden ihm keine Abstimmungsfunktionen angeboten.
5. **Given** eine Neuinstallation ohne Konten, **When** die Anwendung zum
   ersten Mal gestartet wird, **Then** steht über die Installationskonfiguration
   das initiale Administratorkonto zur Verfügung und kann sich über dieselbe
   Anmeldeseite anmelden.

---

### User Story 4 - Eigenes Passwort selbst verwalten (Priority: P2)

Eine angemeldete Person ändert ihr Passwort selbst, ohne Hilfe des
Administrators. Dafür muss sie das aktuelle Passwort bestätigen. Nach der
Änderung gilt nur noch das neue Passwort.

**Why this priority**: Selbstverwaltete Anmeldedaten sind ausdrücklicher Teil
der Anforderung und Voraussetzung dafür, dass ein vom Administrator gesetztes
Einmalpasswort nicht dauerhaft bekannt bleibt.

**Independent Test**: Eine angemeldete Person ändert ihr Passwort; eine
Anmeldung mit dem alten Passwort schlägt danach fehl, mit dem neuen gelingt
sie.

**Acceptance Scenarios**:

1. **Given** eine angemeldete Person, **When** sie das aktuelle Passwort
   korrekt bestätigt und ein gültiges neues Passwort setzt, **Then** gilt ab
   sofort nur noch das neue Passwort.
2. **Given** eine angemeldete Person, **When** sie das aktuelle Passwort
   falsch bestätigt, **Then** bleibt das Passwort unverändert.
3. **Given** eine Person ist auf mehreren Geräten angemeldet, **When** sie
   ihr Passwort ändert, **Then** werden die anderen Anmeldungen dieses Kontos
   beendet.

---

### User Story 5 - Konten durch den Administrator verwalten (Priority: P3)

Der Administrator sieht die vorhandenen Konten, kann ein User-Konto sperren
und entsperren und ein Einmalpasswort setzen, wenn eine Person ihr Passwort
vergessen hat.

**Why this priority**: Da eine Passwortwiederherstellung per E-Mail nicht
Teil der ersten Version ist, ist das Zurücksetzen durch den Administrator der
einzige Weg zur Wiederherstellung eines Kontos; Sperren schützt vor
missbrauchten Konten.

**Independent Test**: Der Administrator sperrt ein User-Konto, dessen
Anmeldung daraufhin abgelehnt wird; nach dem Entsperren und Setzen eines
Einmalpassworts kann sich die Person damit anmelden und muss ein eigenes
Passwort wählen.

**Acceptance Scenarios**:

1. **Given** ein aktives User-Konto, **When** der Administrator es sperrt,
   **Then** werden bestehende Anmeldungen beendet und neue abgelehnt.
2. **Given** ein vergessenes Passwort, **When** der Administrator ein
   Einmalpasswort setzt, **Then** muss die Person es bei der nächsten
   Anmeldung durch ein eigenes Passwort ersetzen, bevor sie die Anwendung
   nutzen kann.
3. **Given** das Administratorkonto, **When** es gesperrt werden soll,
   **Then** wird dies abgelehnt.

### Edge Cases

- Vor Einführung der Konten frei gewählte Identitäten werden nicht übernommen:
  Bei der Einführung werden alle bestehenden Stimmen und die zugehörigen
  Domänenereignisse einmalig gelöscht. Danach ist jede Identität frei und
  kann von einem Konto gewählt werden. Polls, Optionen und Vorlagenkatalog
  bleiben erhalten.
- Ein Browser besitzt noch das alte Identitäts-Cookie einer frei gewählten
  Identität; es wird ignoriert und gewährt weder Zugriff noch Identität.
- Ein Direktlink auf einen Poll wird ohne Anmeldung geöffnet; es wird nur die
  Anmeldeseite gezeigt, ohne Titel oder Inhalte des Polls preiszugeben.
- Die Einladungs-E-Mail kann nicht zugestellt oder nicht versendet werden;
  der Administrator sieht den Versandfehler an der Einladung und kann sie
  erneut versenden.
- Eine Person öffnet einen Einladungslink, während sie bereits mit einem
  anderen Konto angemeldet ist; das Vervollständigen wird abgelehnt, bis sie
  sich abgemeldet hat.
- Wiederholte fehlgeschlagene Anmeldeversuche für denselben Kontonamen werden
  vorübergehend gebremst, ohne das Konto dauerhaft zu sperren.
- Eine Anmeldung läuft während der Nutzung ab; die nächste Aktion führt zur
  Anmeldeseite, ohne bereits abgegebene Stimmen zu verändern.
- Ein Konto wird gesperrt, während die Person gerade abstimmt; die Stimmabgabe
  wird abgelehnt.
- Kontoname und Identität unterscheiden sich nur in Groß-/Kleinschreibung von
  bestehenden Werten.
- Ein Konto, dessen Identität bereits Stimmen hat, wird gesperrt; die Stimmen
  bleiben unverändert im Prüfprotokoll sichtbar.

## Requirements *(mandatory)*

### Functional Requirements

**Zugang und Anmeldung**

- **FR-001**: Das System MUST lokale Konten verwalten, ohne einen externen
  Identitätsanbieter oder Anmeldedienst vorauszusetzen.
- **FR-002**: Die gesamte Anwendung MUST eine Anmeldung voraussetzen. Ohne
  Anmeldung sind ausschließlich die Anmeldeseite und das Vervollständigen
  eines Kontos über einen gültigen Einladungslink erreichbar; alle anderen
  Seiten und Funktionen MUST verweigert werden, ohne fachliche Daten
  offenzulegen.
- **FR-003**: Alle Konten, einschließlich des Administratorkontos, MUST sich
  über dieselbe Anmeldeseite mit Kontoname und Passwort anmelden; eine
  getrennte Administratoranmeldung entfällt.
- **FR-004**: Das System MUST die Abmeldung ermöglichen; danach ist nur noch
  die Anmeldeseite erreichbar.
- **FR-005**: Nach erfolgreicher Anmeldung MUST die Person zu der zuvor
  aufgerufenen Seite gelangen, sofern ihre Rolle diese erlaubt, sonst zur
  Abstimmungsübersicht.
- **FR-006**: Fehlgeschlagene Anmeldungen MUST eine einheitliche Meldung
  erhalten, die nicht erkennen lässt, ob Kontoname oder Passwort falsch war.
- **FR-007**: Wiederholte fehlgeschlagene Anmeldeversuche für einen Kontonamen
  MUST zeitlich gebremst werden.
- **FR-008**: Anmeldungen MUST nach 30 Minuten Inaktivität und spätestens
  nach 12 Stunden ablaufen.

**Konto und Identität**

- **FR-009**: Jedes User-Konto MUST genau eine Identität besitzen, die beim
  Anlegen festgelegt wird, instanzweit eindeutig ist und danach nicht mehr
  geändert werden kann. Das Administratorkonto besitzt keine Identität.
- **FR-010**: Kontonamen MUST instanzweit eindeutig sein; der Vergleich erfolgt
  ohne Beachtung der Groß-/Kleinschreibung.
- **FR-011**: Während der Anmeldung eines User-Kontos MUST die aktuelle
  Identität die Kontoidentität sein; bei Anmeldung des Administratorkontos
  gibt es keine aktuelle Identität. Das freie Setzen oder Ändern einer
  Identität entfällt vollständig.
- **FR-012**: Die persönliche Profilseite MUST die Stimmen der Kontoidentität
  der angemeldeten Person zeigen; der bisherige Identitätsdialog entfällt.
- **FR-013**: Bei der Einführung MUST das System alle bestehenden Stimmen
  frei gewählter Identitäten und die zugehörigen Domänenereignisse einmalig
  löschen; Polls, Optionen und Vorlagenkatalog MUST erhalten bleiben.

**Anmeldedaten**

- **FR-014**: Passwörter MUST nur in nicht umkehrbarer Form gespeichert und
  niemals angezeigt, protokolliert oder in Antworten zurückgegeben werden.
- **FR-015**: Passwörter MUST eine Mindestlänge von 12 Zeichen haben; eine
  Höchstlänge von mindestens 64 Zeichen MUST unterstützt werden.
- **FR-016**: Angemeldete Personen MUST ihr Passwort nach Bestätigung des
  aktuellen Passworts selbst ändern können; andere Anmeldungen desselben
  Kontos MUST dabei beendet werden.
- **FR-017**: Ein Einmalpasswort MUST bei der nächsten Anmeldung durch ein
  selbst gewähltes Passwort ersetzt werden, bevor andere Funktionen genutzt
  werden können.

**Einladungen**

- **FR-018**: Der Administrator MUST Personen per E-Mail-Adresse einladen
  können; das System MUST daraufhin automatisch eine E-Mail mit einem
  persönlichen Link zur Anwendung versenden.
- **FR-019**: Ein Einladungslink MUST einmalig nutzbar sein, nach 7 Tagen
  ablaufen und durch Widerruf oder erneuten Versand ungültig werden.
- **FR-020**: Über einen gültigen Einladungslink MUST die eingeladene Person
  Kontoname, Identität und Passwort selbst festlegen; das Konto erhält immer
  die Rolle „User“.
- **FR-021**: Pro E-Mail-Adresse MUST es höchstens ein Konto oder eine offene
  Einladung geben; die E-Mail-Adresse ist für andere Konten nicht sichtbar.
- **FR-022**: Der Administrator MUST Einladungen mit Status (offen,
  abgelaufen, Versand fehlgeschlagen) sehen, widerrufen und erneut versenden
  können.
- **FR-023**: Eine Selbstregistrierung ohne gültige Einladung MUST nicht
  möglich sein.

**Rollen und Administration**

- **FR-024**: Das System MUST die Rollen „User“ und „Administrator“
  unterscheiden und jedem Konto genau eine Rolle zuweisen. Die Rolle
  „Administrator“ hat ausschließlich das über die Installation bereitgestellte
  initiale Administratorkonto; alle über Einladungen angelegten Konten haben
  die Rolle „User“.
- **FR-025**: Konten mit der Rolle „User“ MUST Abstimmungen sehen und
  benutzen können: Polls und ihr Prüfprotokoll lesen, Stimmen abgeben,
  ersetzen und zurücknehmen, die eigene Profilseite ansehen und das eigene
  Passwort ändern. Weitere Funktionen MUST ihnen verweigert werden.
- **FR-026**: Das Administrationsmenü MUST nur für das Administratorkonto
  sichtbar sein; Administrationsfunktionen MUST für alle anderen Konten auch
  bei direktem Aufruf verweigert werden.
- **FR-027**: Das Administratorkonto MUST keine Stimmen abgeben, ersetzen
  oder zurücknehmen können und keine persönliche Profilseite haben; diese
  Funktionen werden ihm weder angeboten noch bei direktem Aufruf ausgeführt.
  Polls sieht es über die Administration.
- **FR-028**: Bei der Installation MUST das initiale Administratorkonto über
  die Installationskonfiguration bereitgestellt werden, sodass eine leere
  Instanz administrierbar ist.
- **FR-029**: Der Administrator MUST Konten auflisten, User-Konten sperren
  und entsperren und für User-Konten ein Einmalpasswort setzen können.
- **FR-030**: Das Administratorkonto MUST nicht gesperrt werden können.
- **FR-031**: Das Sperren eines Kontos MUST alle bestehenden Anmeldungen
  dieses Kontos beenden; bereits abgegebene Stimmen und das Prüfprotokoll
  bleiben unverändert.

**Querschnitt**

- **FR-032**: Anmeldung, Abmeldung, fehlgeschlagene Anmeldung,
  Passwortänderung, Einladung, Sperrung, Entsperrung und Passwortrücksetzung
  MUST als sicherheitsrelevante Ereignisse ohne Passwortinhalte
  nachvollziehbar festgehalten werden.
- **FR-033**: Der bestehende Schutz zustandsändernder Anfragen gegen
  seitenübergreifende Anfragefälschung MUST für alle Funktionen gelten,
  einschließlich Anmeldung und Vervollständigen einer Einladung.
- **FR-034**: Alle neuen Oberflächen MUST die bestehende Barrierefreiheit,
  Internationalisierung und responsive Darstellung einhalten.

### Key Entities *(include if feature involves data)*

- **Konto**: Lokaler, anmeldefähiger Zugang einer Person. Besitzt einen
  eindeutigen Kontonamen, eine Rolle, einen Status (aktiv, gesperrt) und
  Anmeldedaten. Ein User-Konto besitzt zusätzlich eine nicht öffentliche
  E-Mail-Adresse und genau eine feste Identität; das Administratorkonto hat
  keine Identität. Ein Konto ist kein Synonym für die Identität, sondern deren
  Eigentümer.
- **Einladung**: Vom Administrator ausgestellte, einmalig nutzbare und
  zeitlich begrenzte Berechtigung, für eine E-Mail-Adresse ein User-Konto
  anzulegen. Status: offen, verwendet, abgelaufen, widerrufen; zusätzlich
  wird ein fehlgeschlagener Versand festgehalten.
- **Anmeldedaten**: Das nicht umkehrbar gespeicherte Passwort eines Kontos
  sowie die Kennzeichnung, ob es ein vom Administrator gesetztes
  Einmalpasswort ist.
- **Rolle**: Bestimmt die erlaubten Funktionen eines Kontos; „User“ oder
  „Administrator“.
- **Anmeldung**: Zeitlich begrenzte, serverseitig geführte Zuordnung einer
  Person zu ihrem Konto.
- **Identität**: Die bestehende fachliche `userID`; bei Konten fest und nicht
  frei wählbar.
- **Sicherheitsereignis**: Festgehaltener sicherheitsrelevanter Vorgang an
  einem Konto, getrennt vom Prüfprotokoll eines Polls.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100 % der geprüften Aufrufe ohne Anmeldung werden außer der
  Anmeldeseite und dem Vervollständigen einer gültigen Einladung keine Seiten,
  Polls, Stimmen oder Identitäten ausgeliefert.
- **SC-002**: Eine Person mit Konto kann sich in unter 30 Sekunden anmelden
  und anschließend ohne weitere Identitätsangabe abstimmen.
- **SC-003**: In 100 % der geprüften Fälle ist es einer angemeldeten Person
  nicht möglich, unter einer anderen Identität als ihrer Kontoidentität eine
  Stimme abzugeben.
- **SC-004**: In 100 % der geprüften Fälle ist das Administrationsmenü für
  User-Konten unsichtbar und Administrationsfunktionen werden ihnen
  verweigert.
- **SC-005**: Eine Person kann ihr Passwort ohne Hilfe in unter einer Minute
  ändern; danach ist das alte Passwort in 100 % der Prüfungen unwirksam.
- **SC-006**: Eine eingeladene Person kann ihr Konto über den Link in der
  Einladungs-E-Mail in unter 2 Minuten vervollständigen und ist danach
  angemeldet.
- **SC-007**: Die Anwendung ist nach Neuinstallation ohne externen
  Identitätsanbieter vollständig betreibbar; außer einem konfigurierten
  Mailversand für Einladungen wird kein externer Dienst benötigt.
- **SC-008**: Kein gespeichertes, protokolliertes oder übertragenes Datum
  enthält ein Passwort im Klartext, mit Ausnahme der Eingabe durch die Person
  selbst.

## Assumptions

- „Lokal“ bedeutet: Konten und Anmeldedaten werden in der Anwendung selbst
  gespeichert; es gibt keinen externen Identitätsanbieter und keinen
  Verzeichnisdienst. Für Einladungen wird ein bei der Installation
  konfigurierter Mailversand genutzt; ohne diese Konfiguration können keine
  Einladungen versendet werden.
- Der Link in der Einladungs-E-Mail verweist auf die bei der Installation
  konfigurierte öffentliche Adresse der Anwendung.
- Die heute per Installationskonfiguration hinterlegte Administratoranmeldung
  wird zum initialen Administratorkonto im neuen Kontomodell. Es ist ein
  reines Verwaltungskonto ohne Identität und ohne E-Mail-Adresse; wer als
  Betreiber auch abstimmen möchte, nutzt dafür ein eigenes, eingeladenes
  User-Konto.
- Es gibt genau ein Administratorkonto; Rollenänderungen und weitere
  Administratoren sind nicht Teil dieser Version.
- Die bestehende serverseitige Sitzung mit Cookies und CSRF-Schutz bleibt der
  Anmeldemechanismus und wird auf alle Konten ausgeweitet.
- Technische Betriebsendpunkte für Zustands- und Bereitschaftsprüfungen
  bleiben ohne Anmeldung erreichbar, liefern aber keine fachlichen Daten.
- „Öffentlich“ bei Polls und beim Prüfprotokoll bedeutet künftig: für alle
  angemeldeten Konten sichtbar; ohne Anmeldung ist nichts sichtbar.
- Passwortwiederherstellung erfolgt in der ersten Version durch den
  Administrator per Einmalpasswort; eine Selbstbedienung per E-Mail-Link ist
  nicht Teil dieser Version.
- Die einmalige Löschung aller Stimmen und zugehörigen Domänenereignisse bei
  der Einführung ist gewollt und nicht umkehrbar; Betreiber sichern bei Bedarf
  vorher die Datenbank.
- Der Wegfall des anonymen Zugriffs und des freien Setzens der Identität ist
  eine ausdrücklich geforderte Änderung bestehender Schnittstellenverträge.
- Mehrfaktor-Authentifizierung und Anmeldung über Drittanbieter sind nicht
  Teil der ersten Version.
- Konten werden nicht gelöscht, sondern nur gesperrt, damit die Zuordnung von
  Identität und Stimmen im Prüfprotokoll erhalten bleibt.
- Die Identität eines Kontos ist für alle angemeldeten Konten sichtbar wie
  heute; Kontoname und E-Mail-Adresse sind es nicht.
- Der Begriff „Konto“ wird als neuer Fachbegriff in `CONTEXT.md` aufgenommen
  und klar von „Identität“ abgegrenzt; die Beschreibung des Prüfprotokolls
  als „öffentlich lesbar“ wird dort an die Anmeldepflicht angepasst.
