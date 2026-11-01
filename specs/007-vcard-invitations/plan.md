# Implementation Plan: Einladungen aus einer vCard-Datei

**Branch**: `007-vcard-invitations` | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/007-vcard-invitations/spec.md`

## Summary

Der Administrator wählt in der Einladungsverwaltung eine `.vcf`-Datei. Das
Backend liest sie zustandslos, wertet je Kontakt nur Name und bevorzugte
E-Mail-Adresse aus und liefert eine Vorschau mit Ergebnis je Kontakt (einladen,
erneuern oder Ausschlussgrund). Nach Bestätigung sendet das Frontend die
ausgewählten Kontakte (Adresse und Name) zurück; das Backend prüft jeden erneut,
legt neue Einladungen an oder erneuert abgelaufene, versendet die E-Mails wie
bei der Einzeleinladung und liefert eine Zusammenfassung. Der Name wird als
vorgeschlagener Anzeigename an der Einladung gespeichert, auf der
Einladungsseite vorausgefüllt und bei Annahme oder Widerruf gelöscht.

## Technical Context

**Language/Version**: Java 21 (Spring Boot 3), TypeScript 5 / React 19

**Primary Dependencies**: bestehende; **keine neue Bibliothek** – vCard-Lesen als
kleiner eigener Leser im Adapter (research R1)

**Storage**: SQLite über Flyway; neue Migration `V8` ergänzt
`Invitation.suggestedIdentity`

**Testing**: JUnit 5 (Domäne, Leser), Spring-Boot-HTTP-Tests, Vitest +
Testing Library, Playwright (vier Browser)

**Target Platform**: Linux-Container (amd64/arm64), aktuelle Browser

**Project Type**: Web-Anwendung (hexagonales Backend + React-SPA)

**Performance Goals**: Vorschau für 500 Kontakte < 5 s (SC-002, automatisiert
geprüft, research R10); Versand von 50 Einladungen inklusive Bestätigung < 2 min
(SC-001, manuell im Quickstart)

**Constraints**: Datei ≤ 1 MB und ≤ 500 Kontakte; Datei wird nicht gespeichert;
keine Namen oder Adressen im Sicherheits-Log; CSRF und Admin-Sitzung wie bisher

**Scale/Scope**: ein Administrator, Vereinsgröße (Dutzende bis wenige Hundert
Kontakte je Datei)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Prinzip | Bewertung vor Entwurf | Nach Entwurf |
|---|---|---|
| I. Hexagonal Domain Core | Regeln „einladbar / erneuern / Grund“ liegen in `account-management` (`ContactInvitations`); Dateiformat-Lesen ist Eingangsadapter | ✅ Leser in `adapters`, Domäne erhält nur `ContactCandidate` |
| II. Contract-First API | Zwei neue Admin-Operationen + `suggestedUserID` in `InvitationPreview` werden zuerst im Vertrag beschrieben; bestehende Operationen bleiben semantisch gleich | ✅ siehe [contracts/openapi-delta.md](contracts/openapi-delta.md) |
| III. Explicit Domain Models | `SuggestedIdentity`, `ContactCandidate`, `ContactAssessment`, `ContactOutcome` als kleine typisierte Modelle; `Invitation` kapselt Vorschlag und dessen Löschung | ✅ |
| IV. Feature-Oriented Frontend | Neue Komponente unter `features/admin`, Serverzustand über API-Client/React Query, Vorschau-Auswahl als lokaler UI-Zustand | ✅ |
| V. Testable Changes | Unit-Tests für Leser und Domäne, HTTP-Tests, Vitest, E2E (inkl. schmale Bildschirme) | ✅ |
| Additional Constraints | Schema nur über Flyway `V8`; CSRF/Sitzung unverändert; i18n, Barrierefreiheit, responsive | ✅ |
| Development Workflow: keine unnötigen Abhängigkeiten | eigener Leser statt Bibliothek (R1) | ✅ |

Keine Verstöße, keine Einträge in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/007-vcard-invitations/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── openapi-delta.md
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
account-management/src/main/java/de/justvotes/accountmanagement/core/
├── model/            # + SuggestedIdentity, ContactCandidate, ContactAssessment,
│                     #   ContactOutcome, ContactInvitationResult; Invitation + suggestedIdentity
├── ports/in/         # + InviteContacts (assess, inviteContact)
├── ContactInvitations.java     # package-private: Bewertungsregeln (data-model.md)
└── InvitationManagement.java   # implementiert InviteContacts, delegiert an ContactInvitations

adapters/src/main/java/de/justvotes/adapters/accountmanagement/infra/
├── in/vcard/         # + VCardContactReader (Format → ContactCandidate)
├── in/http/          # AdminInvitationController: Vorschau + Versand
├── in/transaction/   # InvitationDelivery/TransactionalInvitationManagement: Versand je Kontakt
└── out/persistence/  # InvitationEntity + suggestedIdentity

bootstrap/src/main/resources/db/migration/V8__invitation_suggested_identity.sql
bootstrap/src/main/resources/application.yml   # Größenlimit für text/vcard-Body
api-contract/src/main/openapi/justvotes-v1.yaml

frontend/src/features/admin/
├── ContactImport.tsx (+ .test.tsx)   # Dateiauswahl, Vorschau, Auswahl, Zusammenfassung
└── InvitationAdministration.tsx      # bindet ContactImport ein
frontend/src/features/auth/InvitationPage.tsx   # Anzeigename vorbelegen
frontend/src/shared/api/client.ts, translations.ts, styles.css
frontend/e2e/auth.spec.ts             # Import-Ablauf, schmale Breiten
```

**Structure Decision**: Bestehende Module wiederverwenden; kein neues Modul.
Die Funktion gehört fachlich zur Einladung in `account-management`.

## Analyse-Befunde (speckit-analyze 2026-11-01)

| ID | Umgang im Plan |
|---|---|
| E1 | SC-002 wird per HTTP-Test mit 500 synthetischen Kontakten gemessen (research R10) |
| E2 | Vorschau zeigt `unreadableEntries` als Hinweis; Frontend-Test deckt ihn ab (research R9) |
| E3 | `409 invitation-delivery-unavailable` der Vorschau wird in HTTP- und Frontend-Tests geprüft (research R11) |
| F1 | SC-004 wird mit einer strukturgleichen synthetischen Datei automatisiert geprüft; die echte Beispieldatei nur lokal und nie eingecheckt (research R12) – Anpassung der SC-004-Formulierung in spec.md empfohlen |
| I1 | Bewertungsregeln liegen in der package-private Klasse `ContactInvitations` |
| U1 | Kürzung des Namensvorschlags auf 64 Zeichen ist in research R7 begründet; Ergänzung in spec.md empfohlen |
| U2 | Basis-Branch: `main`, sobald PR #77 gemergt ist |

## Complexity Tracking

Keine Einträge.
