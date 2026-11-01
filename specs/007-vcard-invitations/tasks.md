# Tasks: Einladungen aus einer vCard-Datei

**Input**: Design documents from `specs/007-vcard-invitations/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/openapi-delta.md, quickstart.md

**Tests**: Enthalten. Constitution V verlangt Unit-, Integrations- und Frontend-/E2E-Tests für jede Verhaltens- und Vertragsänderung.

**Plan-Stand**: inklusive Analyse-Befunde E1–E3, F1, I1, U2 (plan.md, research R9–R12).

**Organization**: Nach User Stories gruppiert. US1 und US2 sind beide P1; US1 liefert den durchgehenden Ablauf, US2 die vollständige Bewertung inklusive Erneuerung.

**Testdaten**: Ausschließlich synthetische vCards (`*@example.test`); niemals echte Adressbücher einchecken.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallel ausführbar (andere Dateien, keine offenen Abhängigkeiten)
- **[Story]**: US1, US2, US3

## Path Conventions

- Domäne: `account-management/src/main/java/de/justvotes/accountmanagement/core/`
- Adapter: `adapters/src/main/java/de/justvotes/adapters/accountmanagement/infra/`
- Bootstrap/Tests: `bootstrap/src/main/...`, `bootstrap/src/test/java/de/justvotes/bootstrap/`
- Frontend: `frontend/src/...`, `frontend/e2e/`

---

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 Create branch `007-vcard-invitations` from `main` after PR #77 is merged (plan U2; PR #77 was still open, so the branch starts from `feature/identity-management`) and keep `.specify/feature.json` pointing to `specs/007-vcard-invitations`
- [X] T002 [P] Add synthetic fixture `frontend/e2e/fixtures/contacts.vcf` with the six contacts from quickstart.md (vCard 3.0 + 4.0, `TYPE=HOME`, `PREF=1`, a folded `FN` line, umlauts, `TEL`/`ADR`/`BDAY`/`UID`, one without `EMAIL`, one with `EMAIL:kein-at-zeichen`, one duplicate `ANNA@example.test`), all addresses `@example.test`; mirror the structure of the client's sample file per research R12: `EMAIL;TYPE=HOME`, `EMAIL;TYPE=HOME;PREF=1`, `EMAIL;PREF=1`, `BDAY;VALUE=DATE`, `ADR;TYPE=HOME`, `TEL;TYPE=CELL,HOME`, `UID`, `ß` and umlauts in `FN`/`N`, a family name with spaces (e.g. `N:van der Test;Clara;;;`); never copy real data
- [X] T003 [P] Copy the same fixture to `adapters/src/test/resources/vcard/contacts.vcf` for reader tests

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: Vertrag, Schema und Leser müssen stehen, bevor eine Story umgesetzt wird.

- [X] T004 Update `api-contract/src/main/openapi/justvotes-v1.yaml` per contracts/openapi-delta.md: `info.version: 2.1.0`; extract schema `InvitationLocale` (`type: string, enum: [de, en]`) and reference it from `InvitationRequest.locale`; add `POST /admin/invitations/contact-import/preview` (`operationId: previewContactImport`, request body `text/vcard`/`text/x-vcard`/`text/plain`, responses 200 `ContactImportPreview`, 400, 401, 403, 409, 413) and `POST /admin/invitations/contact-import` (`operationId: importContacts`, body `ContactImportRequest` with `contacts` `minItems: 1`, `maxItems: 500`, item `email` `minLength: 3`, `maxLength: 254`, `name` `nullable: true`, `maxLength: 256`, responses 200 `ContactImportResult`, 400, 401, 403, 409); schemas `ContactImportPreview` (`contacts`, `unreadableEntries`), `ContactImportEntry` (`position` `minimum: 1`, `name` nullable, `email` nullable, `outcome` enum `[invite, renew, has-account, already-invited, duplicate-in-file, missing-email, invalid-email]`), `ContactImportResult` (`invited`, `renewed`, `deliveryFailed`, `entries[]` with `outcome` enum `[invited, renewed, delivery-failed, skipped]` and nullable `reason` enum `[has-account, already-invited, invalid-email, duplicate-in-request]`); add optional nullable `suggestedUserID` to `InvitationPreview`; extend `x-status-matrix` (`400` with `contact-import-invalid`, `contact-import-too-many`; new `413` `contact-import-too-large`); all new operations `Cache-Control: no-store`, security session + csrf
- [X] T005 Regenerate sources: `mvn -s .mvn/settings.xml -pl api-contract install` and `cd frontend && pnpm generate:api`; adjust `api-contract/typescript-contract/src/exhaustive-contract.ts` for new enums and run its typecheck
- [X] T006 [P] Create migration `bootstrap/src/main/resources/db/migration/V8__invitation_suggested_identity.sql`: `ALTER TABLE "Invitation" ADD COLUMN "suggestedIdentity" TEXT NULL;` and extend `bootstrap/src/main/java/de/justvotes/bootstrap/SqliteSchemaValidator.java` with the new column and version 8
- [X] T007 [P] Create value object `core/model/SuggestedIdentity.java` (record): same rules as `AccountIdentity` (1–64 code points, no surrounding whitespace); static `Optional<SuggestedIdentity> fromContactName(String)` strips, truncates to 64 code points and returns empty if nothing remains
- [X] T008 Extend `core/model/Invitation.java` with `Optional<SuggestedIdentity> suggestedIdentity`: `issue(email, tokenHash, now, SuggestedIdentity suggestion)` (nullable), `reissue(tokenHash, now)` keeps it, new `reissue(tokenHash, now, SuggestedIdentity replacement)`, `accept(...)` and `revoke()` clear it; extend `restore(...)`; add `boolean isExpired(Instant now)` (status `OPEN` and `!now.isBefore(expiresAt)`)
- [X] T009 [P] Extend `core/model/InvitationPreview.java` with `Optional<SuggestedIdentity> suggestedIdentity` and fill it in `InvitationManagement.inspect`
- [X] T010 Extend `out/persistence/InvitationEntity.java` with column `suggestedIdentity` (nullable `String`) mapped in `apply`/`toDomain`; extend `account-management/src/test/java/de/justvotes/accountmanagement/core/InMemoryInvitations.java` accordingly
- [X] T011 [P] Unit tests in `account-management/src/test/java/de/justvotes/accountmanagement/core/model/InvitationTest.java` and `ValueObjectsTest.java`: suggestion kept on `reissue`, replaced on `reissue(…, replacement)`, cleared on `accept` and `revoke`; `isExpired`; `SuggestedIdentity.fromContactName` trims, truncates 65 code points (incl. emoji) to 64, empty for blank
- [X] T012 Create reader `in/vcard/VCardContactReader.java` (adapters, no new dependency, research R1): input `String` (UTF-8, BOM tolerated), CRLF/LF, unfold lines starting with space or tab, ignore group prefixes (`item1.EMAIL`), case-insensitive property and parameter names, unescape `\,` `\;` `\\` `\n`; per `BEGIN:VCARD…END:VCARD` emit `ContactCandidate(position, name, email)` with `name` = `FN`, else `N` given + family name; `email` chosen per research R2 (lowest `PREF`, then `TYPE=pref`, else first); ignore all other properties; count entries without `END:VCARD` as unreadable; throw `ContactImportInvalidException` if the input has no `BEGIN:VCARD` or yields zero readable contacts and `ContactImportTooManyException` above 500 contacts; return `ContactImportReading(List<ContactCandidate> contacts, int unreadableEntries)`
- [X] T013 [P] Create domain records `core/model/ContactCandidate.java` (`int position`, `Optional<String> name`, `Optional<String> email`), `ContactOutcome.java` (`INVITE, RENEW, HAS_ACCOUNT, ALREADY_INVITED, DUPLICATE_IN_FILE, MISSING_EMAIL, INVALID_EMAIL`), `ContactAssessment.java`, `ContactInvitationResult.java` (outcome `INVITED, RENEWED, DELIVERY_FAILED, SKIPPED`, reason nullable `HAS_ACCOUNT, ALREADY_INVITED, INVALID_EMAIL, DUPLICATE_IN_REQUEST`) and exceptions `core/exception/ContactImportInvalidException.java`, `ContactImportTooManyException.java`
- [X] T014 Reader tests `adapters/src/test/java/de/justvotes/adapters/accountmanagement/infra/in/vcard/VCardContactReaderTest.java`: fixture file reads all six contacts; folded line; escapes; group prefix; `PREF=1` beats first address; vCard-3 `TYPE=pref`; umlauts; missing `END:VCARD` counted as unreadable; plain text → invalid; 501 contacts → too many; other properties are not exposed

**Checkpoint**: Vertrag generiert, Schema validiert, Leser getestet.

---

## Phase 3: User Story 1 – Kontakte aus einer vCard-Datei einladen (P1) 🎯 MVP

**Goal**: Datei wählen → Vorschau → bestätigen → Einladungen mit Namensvorschlag versendet → Zusammenfassung; Einladungsseite füllt den Anzeigenamen vor.

**Independent Test**: Fixture mit nur neuen Adressen hochladen, bestätigen; je Adresse eine offene Einladung + Mail; Link zeigt vorausgefüllten Anzeigenamen.

### Tests for User Story 1

- [X] T015 [P] [US1] Domain tests `account-management/src/test/java/de/justvotes/accountmanagement/core/ContactInvitationsTest.java`: new addresses assess as `INVITE`; `invite` creates one invitation per contact with `SuggestedIdentity` from the name; preview creates nothing (FR-006); mail unavailable → `InvitationDeliveryUnavailableException`
- [X] T016 [P] [US1] HTTP test `bootstrap/src/test/java/de/justvotes/bootstrap/ContactImportHttpTest.java`: preview of fixture returns entries in file order with `outcome` and `unreadableEntries`; nothing sent before confirm; confirm sends mails (fake mailer) and returns counts; `POST /invitations/inspection` returns `suggestedUserID`; user role → 403; no session → 401; missing CSRF → 403; body > 1 MB → 413 `contact-import-too-large`; text file → 400 `contact-import-invalid`; entry without `END:VCARD` → preview with `unreadableEntries: 1`; with the fake mailer reporting `isAvailable() == false` both operations → 409 `invitation-delivery-unavailable` (research R11); preview of 500 generated synthetic contacts (mixed 3.0/4.0 with extra properties) answers in under 5 s (SC-002, research R10)
- [X] T017 [P] [US1] Frontend test `frontend/src/features/admin/ContactImport.test.tsx`: choosing a file shows preview rows (name, email, outcome text); confirm calls `importContacts` with selected contacts and locale and shows the summary; client-side size check > 1 MB shows the message without a request; `unreadableEntries: 2` shows „2 Einträge der Datei konnten nicht gelesen werden“; a 409 `invitation-delivery-unavailable` shows the same message as the single invitation

### Implementation for User Story 1

- [X] T018 [US1] Create in-port `core/ports/in/InviteContacts.java` with `List<ContactAssessment> assess(List<ContactCandidate> contacts)` and `IssuedInvitation inviteContact(String email, String name)` (one contact, own transaction, returns issued invitation or throws a skip reason)
- [X] T019 [US1] Create package-private class `core/ContactInvitations.java` holding the assessment rules (plan I1) and implement `InviteContacts` in `core/InvitationManagement.java` by delegating to it: `assess` per data-model rules 1–7 (for now `INVITE`, `HAS_ACCOUNT`, `MISSING_EMAIL`, `INVALID_EMAIL`) with at most two indexed lookups per contact (research R10), `assess` and `inviteContact` both check `mailer.isAvailable()`, re-checks rules and calls `Invitation.issue(..., SuggestedIdentity.fromContactName(name))`
- [X] T020 [US1] Expose in `in/transaction/TransactionalInvitationManagement.java` (`assess` read-only, `inviteContact` per contact in its own transaction) and add `InvitationDelivery.inviteContact(email, name, locale)` in `in/transaction/InvitationDelivery.java` (mail after commit, record failure as today)
- [X] T021 [US1] Add `previewContactImport` and `importContacts` to `in/http/AdminInvitationController.java`: read body up to 1 MB (else `413`), parse with `VCardContactReader`, map assessments to `ContactImportEntry`; `importContacts` loops contacts, collects `ContactImportResult` with counts; log `invitation-issued` per invitation and one `contact-import` event with counters only (extend `adapters/.../shared/infra/in/http/SecurityEventLogger.java`)
- [X] T022 [US1] Map new exceptions in `adapters/src/main/java/de/justvotes/adapters/shared/infra/in/http/ApiExceptionHandler.java` (`contact-import-invalid` 400, `contact-import-too-many` 400) and the size limit to `413 contact-import-too-large`; allow `text/vcard`/`text/x-vcard` request bodies for the preview route (message converter or `String` body) in `bootstrap/src/main/java/de/justvotes/bootstrap/config/`
- [X] T023 [US1] Return `suggestedUserID` from `inspectInvitation` in `bootstrap/src/main/java/de/justvotes/bootstrap/InvitationAcceptanceController.java`
- [X] T024 [P] [US1] Add `previewContactImport(file text)` (content type `text/vcard`) and `importContacts(request)` to `frontend/src/shared/api/client.ts`
- [X] T025 [US1] Create `frontend/src/features/admin/ContactImport.tsx`: file input (`accept=".vcf,text/vcard,text/x-vcard"`), read as text, 1 MB check, preview list (table with `admin-card-table` + `data-label` for narrow containers), language select (reuse invitation locale options), confirm/cancel, summary with counts and skipped entries; hint „N Einträge der Datei konnten nicht gelesen werden“ when `unreadableEntries > 0` (research R9); on 409 `invitation-delivery-unavailable` the same message as the single invitation (research R11); live region for status; invalidate `queryKeys.invitations` after import
- [X] T026 [US1] Embed `ContactImport` in `frontend/src/features/admin/InvitationAdministration.tsx` below the single-invitation form (hidden when mail delivery is unavailable, same rule as single invite)
- [X] T027 [US1] Prefill the display name with `suggestedUserID` in `frontend/src/features/auth/InvitationPage.tsx` (still editable, all existing validation unchanged) and extend `frontend/src/features/auth/InvitationPage.test.tsx`
- [X] T028 [P] [US1] Add German and English texts (`admin.contactImport*`, outcome labels, errors for invalid/too large/too many, summary) in `frontend/src/shared/i18n/translations.ts`

**Checkpoint**: MVP – neue Kontakte lassen sich aus einer Datei einladen.

---

## Phase 4: User Story 2 – Nicht einladbare Kontakte erkennen, Abgelaufene erneuern (P1)

**Goal**: Alle Ausschlussgründe und die Erneuerung abgelaufener Einladungen in Vorschau und Versand.

**Independent Test**: Fixture mit je einem Kontakt pro Grund + einer abgelaufenen Einladung; Vorschau zeigt alle Gründe, Versand erneuert die abgelaufene statt eine zweite anzulegen.

### Tests for User Story 2

- [X] T029 [P] [US2] Extend `ContactInvitationsTest.java`: `DUPLICATE_IN_FILE` (case-insensitive), `HAS_ACCOUNT` incl. administrator email, `ALREADY_INVITED` for valid open invitation, `RENEW` for expired open invitation, revoked/accepted invitation → `INVITE`; `inviteContact` on expired invitation reissues (new token, new expiry, suggestion replaced) and creates no second invitation; address taken between preview and confirm → skip reason
- [X] T030 [P] [US2] Extend `ContactImportHttpTest.java`: preview of fixture shows every outcome; confirm with an expired invitation returns `renewed` and old link → `invitation-not-usable`; duplicate addresses in request → `skipped/duplicate-in-request`

### Implementation for User Story 2

- [X] T031 [US2] Complete `assess` in `core/InvitationManagement.java` with `DUPLICATE_IN_FILE`, `ALREADY_INVITED`, `RENEW` (needs `InvitationRepository.findOpenByEmailKey(String)` in `core/ports/out/InvitationRepository.java`, `JpaInvitationPersistenceAdapter`, `SpringDataInvitationRepository`, `InMemoryInvitations`)
- [X] T032 [US2] Complete `inviteContact`: expired → `reissue(token, now, suggestion)` and result `RENEWED`; valid open → skip `ALREADY_INVITED`; account → skip `HAS_ACCOUNT`; handle duplicates within the request in `AdminInvitationController.importContacts`; log `invitation-resent` for renewals
- [X] T033 [US2] Show all outcome labels and the renewal hint in `frontend/src/features/admin/ContactImport.tsx` and list skipped contacts with reason in the summary (FR-011, SC-006); extend `ContactImport.test.tsx`

**Checkpoint**: Vorschau und Versand verhalten sich bei allen Gründen korrekt.

---

## Phase 5: User Story 3 – Auswahl vor dem Versand anpassen (P2)

**Goal**: Einladbare Kontakte einzeln oder gesammelt abwählen.

**Independent Test**: Zwei Kontakte abwählen, bestätigen → genau diese erhalten keine Einladung; alles abgewählt → Bestätigen deaktiviert.

- [X] T034 [P] [US3] Extend `ContactImport.test.tsx`: deselected contacts are not sent; "alle auswählen/abwählen"; confirm disabled with zero selected; checkbox labels name the contact
- [X] T035 [US3] Add per-row checkboxes (only `invite`/`renew` rows, default selected) and a select-all control to `frontend/src/features/admin/ContactImport.tsx`; send only selected contacts; show selected count on the confirm button

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T036 [P] E2E `frontend/e2e/auth.spec.ts`: admin imports `e2e/fixtures/contacts.vcf` with mocked API, checks preview outcomes, deselects one, confirms, sees summary; repeat preview at 320 px and 375 px without horizontal overflow; axe without serious violations
- [X] T037 [P] E2E: invitation link with `suggestedUserID` shows prefilled, editable display name in `frontend/e2e/auth.spec.ts`
- [X] T038 [P] Extend `SecurityEventLoggingTest.java` in `bootstrap/src/test/java/de/justvotes/bootstrap/`: import logs `contact-import` with counters and no names/addresses from the fixture
- [X] T039 [P] Extend `LocalAccountsMigrationTest.java` or add `InvitationSuggestionMigrationTest.java` in `bootstrap/src/test/java/de/justvotes/bootstrap/`: V8 applies on a V7 database with existing invitations
- [X] T040 [P] Update `README.md` (section Accounts, Sign-in and Invitations: import from vCard, limits) and `CONTEXT.md` (no new term needed; mention suggested display name if helpful)
- [X] T041 Run full gates: `mvn -s .mvn/settings.xml test`; in `frontend/`: `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:e2e`; contract typecheck; `docker build` + container start
- [X] T042 Run manual scenarios 1–10 from `specs/007-vcard-invitations/quickstart.md` with Mailpit and synthetic data, and scenario 11 locally with the client's real sample file (preview only, cancel, never commit or copy the file; research R12)

---

## Dependencies & Execution Order

- **Phase 1 → Phase 2 → Stories.** T004 → T005 before any generated type is used; T008 before T010/T019; T012/T013 before T021.
- **US1** (T015–T028) needs Phase 2. **US2** (T029–T033) builds on US1's endpoints and domain methods. **US3** (T034–T035) needs only US1's `ContactImport.tsx`.
- **Polish** after the stories it covers.

## Parallel Opportunities

- Phase 2: T006, T007, T009, T011, T013 in parallel after T004/T005 (T008 before T010; T013 before T012 and T014).
- US1: T015, T016, T017 together; T024 and T028 parallel to backend T018–T023.
- US2: T029 and T030 together.
- Polish: T036–T040 together.

```text
# US1 tests together
T015 ContactInvitationsTest · T016 ContactImportHttpTest · T017 ContactImport.test.tsx
```

## Implementation Strategy

1. **MVP** = Phase 1 + 2 + US1: Import neuer Kontakte mit Vorschau, Versand, Namensvorschlag.
2. **US2** direkt danach (ebenfalls P1): alle Ausschlussgründe und Erneuerung – erst damit ist ein zweiter Import derselben Datei sicher.
3. **US3**: Abwählen einzelner Kontakte.
4. **Polish**: E2E, Logging, Doku, Gates, manuelle Szenarien.

## Notes

- Keine neue Bibliothek für vCard (research R1).
- Datei und Vorschau werden nie gespeichert; Namen nur als `suggestedIdentity` bis Annahme/Widerruf.
- Generierte Quellen nicht committen.

## Phase 7: Convergence

- [X] T043 In `frontend/src/features/admin/ContactImport.tsx` keep the file chooser disabled with the `admin.deliveryUnavailable` message after a request returned `409 invitation-delivery-unavailable` (no further upload attempts until the page is reloaded), and cover it in `ContactImport.test.tsx`; the frontend has no availability signal to hide the import up front, so this is the closest match to "hidden when mail delivery is unavailable" per T026 / plan research R11 (partial)
