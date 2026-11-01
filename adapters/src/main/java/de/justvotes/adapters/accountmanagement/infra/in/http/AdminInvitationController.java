package de.justvotes.adapters.accountmanagement.infra.in.http;

import de.justvotes.accountmanagement.core.exception.ContactImportTooManyException;
import de.justvotes.accountmanagement.core.exception.ContactSkippedException;
import de.justvotes.accountmanagement.core.model.ContactInvitation;
import de.justvotes.accountmanagement.core.model.EmailAddress;
import de.justvotes.accountmanagement.core.model.InvitationId;
import de.justvotes.accountmanagement.core.model.InvitationOverview;
import de.justvotes.accountmanagement.core.ports.in.InviteContacts;
import de.justvotes.accountmanagement.core.ports.in.ManageInvitations;
import de.justvotes.adapters.accountmanagement.infra.in.vcard.VCardContactReader;
import de.justvotes.adapters.accountmanagement.infra.in.transaction.InvitationDelivery;
import de.justvotes.adapters.shared.infra.in.http.AuthenticatedAccount;
import de.justvotes.adapters.shared.infra.in.http.AuthenticatedAccounts;
import de.justvotes.adapters.shared.infra.in.http.ContactImportTooLargeException;
import de.justvotes.adapters.shared.infra.in.http.OpaqueIdCodec;
import de.justvotes.adapters.shared.infra.in.http.SecurityEventLogger;
import de.justvotes.api.v1.model.ContactImportContact;
import de.justvotes.api.v1.model.ContactImportEntry;
import de.justvotes.api.v1.model.ContactImportOutcome;
import de.justvotes.api.v1.model.ContactImportPreview;
import de.justvotes.api.v1.model.ContactImportRequest;
import de.justvotes.api.v1.model.ContactImportResult;
import de.justvotes.api.v1.model.ContactImportResultEntry;
import de.justvotes.api.v1.model.InvitationLocale;
import de.justvotes.api.v1.model.InvitationRequest;
import de.justvotes.api.v1.model.InvitationSummary;
import de.justvotes.api.v1.server.InvitationAdministrationApi;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@RestController
public class AdminInvitationController implements InvitationAdministrationApi {
    private static final Locale DEFAULT_LOCALE = Locale.GERMAN;
    private final ManageInvitations invitations;
    private final InviteContacts contacts;
    private final InvitationDelivery delivery;
    private final SecurityEventLogger securityEvents;
    private final VCardContactReader reader = new VCardContactReader();

    public AdminInvitationController(ManageInvitations invitations, InviteContacts contacts, InvitationDelivery delivery,
                                     SecurityEventLogger securityEvents) {
        this.invitations = invitations;
        this.contacts = contacts;
        this.delivery = delivery;
        this.securityEvents = securityEvents;
    }

    private static String apiValue(Enum<?> value) {
        return value.name().toLowerCase(Locale.ROOT).replace('_', '-');
    }

    private static InvitationId invitationId(String value) {
        return InvitationId.of(OpaqueIdCodec.decode(AccountResponseMapper.INVITATION_ID_KIND, value));
    }

    private static Locale locale(InvitationLocale locale) {
        if (locale == null) {
            return DEFAULT_LOCALE;
        }
        return Locale.forLanguageTag(locale.getValue());
    }

    @Override
    public ResponseEntity<List<InvitationSummary>> invitations() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(invitations.invitations().stream().map(AccountResponseMapper::summary).toList());
    }

    @Override
    public ResponseEntity<InvitationSummary> createInvitation(InvitationRequest request) {
        InvitationOverview created = delivery.invite(request.getEmail(), locale(request.getLocale()));
        AuthenticatedAccount actor = AuthenticatedAccounts.current();
        securityEvents.invitationIssued(created.invitation().id().orElseThrow().value(), actor.accountId());
        return ResponseEntity.status(HttpStatus.CREATED).cacheControl(CacheControl.noStore())
                .body(AccountResponseMapper.summary(created));
    }

    @Override
    public ResponseEntity<InvitationSummary> resendInvitation(String invitationId) {
        InvitationId id = invitationId(invitationId);
        InvitationOverview resent = delivery.resend(id, DEFAULT_LOCALE);
        AuthenticatedAccount actor = AuthenticatedAccounts.current();
        securityEvents.invitationResent(id.value(), actor.accountId());
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(AccountResponseMapper.summary(resent));
    }

    @Override
    public ResponseEntity<Void> revokeInvitation(String invitationId) {
        InvitationId id = invitationId(invitationId);
        invitations.revoke(id);
        AuthenticatedAccount actor = AuthenticatedAccounts.current();
        securityEvents.invitationRevoked(id.value(), actor.accountId());
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }

    @Override
    public ResponseEntity<ContactImportPreview> previewContactImport(String body) {
        if (body != null && body.getBytes(StandardCharsets.UTF_8).length > ContactImportTooLargeException.MAX_BYTES) {
            throw new ContactImportTooLargeException();
        }
        VCardContactReader.Reading reading = reader.read(body);
        List<ContactImportEntry> entries = contacts.assess(reading.contacts()).stream()
                .map(assessment -> new ContactImportEntry(assessment.candidate().position(),
                        ContactImportOutcome.fromValue(apiValue(assessment.outcome())))
                        .name(assessment.candidate().name().orElse(null))
                        .email(assessment.email().map(EmailAddress::value)
                                .or(() -> assessment.candidate().email()).orElse(null)))
                .toList();
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(new ContactImportPreview(entries, reading.unreadableEntries()));
    }

    /**
     * Invites the selected contacts one by one; a skipped contact or failed delivery never stops the others.
     */
    @Override
    public ResponseEntity<ContactImportResult> importContacts(ContactImportRequest request) {
        if (request.getContacts().size() > ContactImportTooManyException.MAX_CONTACTS) {
            throw new ContactImportTooManyException();
        }
        Locale locale = locale(request.getLocale());
        long actorId = AuthenticatedAccounts.current().accountId();
        Set<String> seen = new HashSet<>();
        List<ContactImportResultEntry> entries = new ArrayList<>();
        int invited = 0;
        int renewed = 0;
        int failed = 0;
        int skipped = 0;
        for (ContactImportContact contact : request.getContacts()) {
            String email = contact.getEmail().strip();
            ContactImportResultEntry entry = new ContactImportResultEntry(email, ContactImportResultEntry.OutcomeEnum.SKIPPED);
            if (!seen.add(email.toLowerCase(Locale.ROOT))) {
                entries.add(entry.reason(ContactImportResultEntry.ReasonEnum.DUPLICATE_IN_REQUEST));
                skipped++;
                continue;
            }
            ContactInvitation invitation;
            try {
                invitation = contacts.inviteContact(email, contact.getName());
            } catch (ContactSkippedException exception) {
                entries.add(entry.reason(ContactImportResultEntry.ReasonEnum.fromValue(apiValue(exception.reason()))));
                skipped++;
                continue;
            }
            long invitationId = invitation.issued().invitation().id().orElseThrow().value();
            if (invitation.renewed()) {
                securityEvents.invitationResent(invitationId, actorId);
                renewed++;
                entry.outcome(ContactImportResultEntry.OutcomeEnum.RENEWED);
            } else {
                securityEvents.invitationIssued(invitationId, actorId);
                invited++;
                entry.outcome(ContactImportResultEntry.OutcomeEnum.INVITED);
            }
            if (delivery.deliver(invitation.issued(), locale).invitation().deliveryFailed()) {
                failed++;
                entry.outcome(ContactImportResultEntry.OutcomeEnum.DELIVERY_FAILED);
            }
            entries.add(entry);
        }
        securityEvents.contactImport(actorId, invited, renewed, skipped, failed);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(new ContactImportResult(invited, renewed, failed, entries));
    }
}
