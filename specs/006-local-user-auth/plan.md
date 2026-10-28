# Implementation Plan: Lokale Konten mit Anmeldung und Berechtigungen

**Branch**: `006-local-user-auth` | **Date**: 2026-10-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/006-local-user-auth/spec.md`

## Summary

JustVotes wird von einer anonymen Anwendung mit frei wählbarer `userID` und
einer separaten, per Umgebungsvariable konfigurierten Administratoranmeldung
auf eine vollständig anmeldepflichtige Anwendung mit lokalen Konten umgestellt.
Ein neues, frameworkunabhängiges Domänenmodul `account-management` verwaltet
Konten, Einladungen, Passwortregeln und Rollen. Die bestehende serverseitige
Spring-Security-Sitzung mit Cookie und CSRF bleibt der Anmeldemechanismus und
wird auf alle Konten ausgeweitet; jede API außer Anmeldung, CSRF-Bootstrap und
Einladungsannahme verlangt eine gültige Sitzung. User-Konten stimmen unter
ihrer festen Identität ab, das einzige Administratorkonto (aus der
Installationskonfiguration) hat keine Identität und nutzt nur die
Administration. Einladungen werden über SMTP mit einem einmalig nutzbaren Link
versendet. Eine Flyway-Migration löscht einmalig alle Stimmen und
Stimm-Domänenereignisse. Das Frontend erhält eine Anmeldeschranke, Anmelde-,
Einladungs- und Passwortseiten sowie Konto- und Einladungsverwaltung im
Administrationsbereich; der Identitätsdialog entfällt.

## Technical Context

**Language/Version**: Java 21 (Backend), TypeScript 5.7 strict (Frontend)

**Primary Dependencies**: Spring Boot 3.4.2 (Web, Security, Data JPA,
Actuator), neu `spring-boot-starter-mail`; Flyway, SQLite JDBC, Vavr;
OpenAPI Generator (Server + TypeScript); React 19, React Router 7, TanStack
Query 5, Vite 6

**Storage**: SQLite mit Flyway-Migrationen (neu: `V7__local_accounts.sql`)

**Testing**: JUnit 5 + Spring Boot Test (Unit, HTTP- und
Persistenz-Integrationstests), Vitest + Testing Library, Playwright (+ axe)

**Target Platform**: Linux-Container hinter TLS-Proxy, eine Instanz

**Project Type**: Webanwendung (Spring-Boot-Backend mit Hexagonal-Modulen +
React-SPA, gleicher Origin)

**Performance Goals**: Anmeldung < 1 s serverseitig trotz
Passwort-Hashing-Kosten (Spec SC-002: Anmeldung in < 30 s für die Person)

**Constraints**: kein externer IdP; einzige externe Abhängigkeit ist ein
SMTP-Server für Einladungen; kein Klartextpasswort in Speicher, Logs oder
Antworten; bestehende Sitzung/CSRF darf nicht abgeschwächt werden; einzelne
Instanz (In-Memory-Drosselung zulässig)

**Scale/Scope**: kleine Instanzen (≈ 10–1 000 Konten); 1 neues Domänenmodul,
~15 neue/geänderte API-Operationen, 4 neue Frontend-Seiten

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Prinzip | Bewertung vor Design | Nach Design |
|---|---|---|
| I. Hexagonal Domain Core | Konten/Einladungen als eigenes, frameworkfreies Modul `account-management` mit In-/Out-Ports; Spring Security, Mail, JPA nur in `adapters`/`bootstrap`. | ✅ siehe [data-model.md](data-model.md); Hashing, Mailversand, Uhr, Token-Erzeugung sind Out-Ports. |
| II. Contract-First API | Alle HTTP-Änderungen zuerst in `justvotes-v1.yaml`; Entfernen von `POST /identity` und `/admin/login` ist ausdrücklich durch Spec (FR-003, FR-011) gefordert. | ✅ Delta in [contracts/openapi-delta.md](contracts/openapi-delta.md); Vertragsversion `1.0.0 → 2.0.0`. |
| III. Explicit Domain Models | `Account` und `Invitation` kapseln Status, Rolle, Einmalpasswort, Ablauf; Regeln (Admin nicht sperrbar, Einladung einmalig) im Aggregat. | ✅ Zustandsübergänge in data-model.md. |
| IV. Feature-Oriented Frontend | Neues Feature `frontend/src/features/auth`, Kontoverwaltung in `features/admin`; Sitzungszustand über React Query. | ✅ |
| V. Testable Changes | Unit-Tests für Aggregate, HTTP-Tests für Zugriffsschutz-Matrix, Persistenz-/Migrationstest, Vitest + Playwright für Anmelde- und Einladungsablauf. | ✅ siehe [quickstart.md](quickstart.md). |
| Constraints: Flyway | Schema und Datenlöschung ausschließlich über `V7`. | ✅ |
| Constraints: Sitzung + CSRF | Bleibt erhalten und wird auf alle Konten ausgeweitet; kein Token im Client. Der Wortlaut „bestehende serverseitige Administratorsitzung“ wird nicht abgeschwächt, sondern verallgemeinert; Empfehlung: separate PATCH-Änderung der Constitution zu „serverseitige Sitzung“ (nicht Teil dieses Features). | ✅ |
| Constraints: keine unsichere clientseitige Authentifizierung | Das Einladungstoken liegt nur kurzzeitig tab-lokal in `sessionStorage`, um eine Abmeldung zu überstehen (research R13); es authentifiziert keine Sitzung, ist einmalig nutzbar und wird nach Annahme/Ablehnung gelöscht. Anmeldung bleibt ausschließlich die serverseitige Sitzung. | ✅ |
| Constraints: Betriebsendpunkte und CI-Containerprüfung | `/actuator/health` muss ohne Mailserver `UP` bleiben; Mail-Health-Indikator wird deaktiviert, Mail-Erreichbarkeit zeigt sich am Einladungsstatus (research R7). | ✅ |
| Constraints: i18n, a11y, responsive, CONTEXT.md | Neue Texte in `translations.ts`; Begriff „Konto“ und „Einladung“ werden in `CONTEXT.md` ergänzt, „öffentlich lesbar“ angepasst. | ✅ |
| Workflow: keine unnötigen Abhängigkeiten | Einzige neue Laufzeitabhängigkeit `spring-boot-starter-mail` (zwingend für FR-018). Keine neue Test-Abhängigkeit. | ✅ |

**Ergebnis**: keine Verstöße; Complexity Tracking entfällt.

## Project Structure

### Documentation (this feature)

```text
specs/006-local-user-auth/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── openapi-delta.md # Phase 1
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
pom.xml                                   # + Modul account-management
account-management/                       # NEU: frameworkfreier Domänenkern
└── src/main/java/de/justvotes/accountmanagement/
    ├── package-info.java
    └── core/
        ├── model/        # Account, AccountId, AccountName, Role, AccountStatus,
        │                 # Invitation, InvitationId, InvitationStatus, EmailAddress,
        │                 # Password (Regeln), PasswordHash, InvitationToken
        ├── exception/    # AccountNameTaken, IdentityTaken, InvitationNotUsable, ...
        └── ports/
            ├── in/       # Authenticate, ManageOwnCredentials, AcceptInvitation,
            │             # ManageInvitations, ManageAccounts, ViewAccounts
            └── out/      # AccountRepository, InvitationRepository, PasswordHasher,
                          # InvitationMailer, TokenGenerator, UtcClock
adapters/src/main/java/de/justvotes/adapters/
├── accountmanagement/infra/
│   ├── in/http/          # AdminAccountController, AdminInvitationController
│   ├── in/transaction/   # Transactional* Wrapper
│   └── out/
│       ├── persistence/  # AccountEntity, InvitationEntity, Jpa*Adapter
│       └── security/     # SecureRandomTokenGenerator (nur JDK)
├── shared/infra/in/http/
│   ├── AuthenticatedAccount.java    # NEU: Request-Attribut des angemeldeten Kontos
│   ├── AuthenticatedAccounts.java   # NEU: Zugriff für Controller
│   └── SecurityEventLogger.java     # NEU: strukturierte Sicherheitsereignisse (nur SLF4J)
└── pollmanagement/infra/in/http/
    ├── IdentityController.java      # nur noch GET /identity/votes aus Principal
    ├── PublicPollController.java    # Identität aus Principal statt Cookie
    └── IdentityCookieCodec.java     # entfällt
bootstrap/src/main/
├── java/de/justvotes/bootstrap/
│   ├── AdminSessionController.java          # entfällt → SessionController
│   ├── SessionController.java               # NEU: Login, Logout, Sitzung, Passwortwechsel
│   ├── InvitationAcceptanceController.java  # NEU: Einladung prüfen/annehmen + Anmeldung
│   └── config/
│       ├── SecurityConfiguration.java       # Zugriffsmatrix
│       ├── SessionValidationFilter.java     # NEU: Epoche, Status, 12 h, Passwortwechselpflicht
│       ├── LoginThrottle.java               # NEU: In-Memory-Drosselung
│       ├── SpringPasswordHasher.java        # NEU: DelegatingPasswordEncoder (spring-security-crypto)
│       ├── SmtpInvitationMailer.java        # NEU: JavaMailSender (spring-boot-starter-mail)
│       └── AccountManagementConfiguration.java  # NEU: Verdrahtung, Admin-Bootstrap
└── resources/
    ├── application.yml                      # Mail, Mail-Health aus, Session-Timeout, PUBLIC_BASE_URL
    └── db/migration/V7__local_accounts.sql
api-contract/src/main/openapi/justvotes-v1.yaml
frontend/src/
├── app/App.tsx, Header.tsx                  # Anmeldeschranke, rollenabhängige Navigation
├── features/auth/                           # NEU: LoginPage, InvitationPage,
│                                            # PasswordChangePage, sessionQueries
├── features/admin/                          # + AccountAdministration, InvitationAdministration
├── features/polls/PollPage.tsx              # ohne Identitätsdialog
└── shared/ui/IdentityDialog.tsx, IdentityEditor.tsx  # entfallen
frontend/e2e/auth.spec.ts                    # NEU
```

**Adapter-/Security-Grenze**: `adapters` hängt nicht von Spring Security ab.
Controller, die Spring-Security-Kontext schreiben (Login, Logout,
Passwortwechsel, Einladungsannahme mit Anmeldung), liegen daher wie heute
`AdminSessionController` in `bootstrap` (`SessionController`,
`InvitationAcceptanceController`). Die übrigen Controller in `adapters` lesen
das angemeldete Konto als Request-Attribut `AuthenticatedAccount` (Record in
`adapters/shared/infra/in/http`), das der `SessionValidationFilter` in
`bootstrap` setzt. Aus demselben Grund liegen `SpringPasswordHasher`
(Spring Security Crypto) und `SmtpInvitationMailer` (Spring Mail) in
`bootstrap`; `adapters` erhält keine neue Abhängigkeit. Der
`SecurityEventLogger` benötigt nur SLF4J und liegt in
`adapters/shared/infra/in/http`, damit Controller in `adapters` und `bootstrap`
ihn gleichermaßen nutzen können (bootstrap hängt von adapters ab, nicht
umgekehrt).

**Structure Decision**: Bestehende Hexagonal-Struktur wird um ein drittes
Domänenmodul `account-management` erweitert (analog `template-catalog`).
`poll-management` bleibt unverändert bis auf das Entfernen des
Identitätswechsel-Anwendungsfalls; die Kopplung erfolgt im HTTP-Adapter, der
die `Identity` aus dem angemeldeten Principal ableitet.

## Complexity Tracking

Keine Verstöße.
