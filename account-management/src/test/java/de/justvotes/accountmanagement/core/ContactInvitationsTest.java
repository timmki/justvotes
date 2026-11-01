package de.justvotes.accountmanagement.core;

import de.justvotes.accountmanagement.core.TestSupport.MutableClock;
import de.justvotes.accountmanagement.core.TestSupport.RecordingMailer;
import de.justvotes.accountmanagement.core.TestSupport.SequentialTokens;
import de.justvotes.accountmanagement.core.exception.ContactSkippedException;
import de.justvotes.accountmanagement.core.exception.InvitationDeliveryUnavailableException;
import de.justvotes.accountmanagement.core.exception.InvitationNotUsableException;
import de.justvotes.accountmanagement.core.model.ContactAssessment;
import de.justvotes.accountmanagement.core.model.ContactCandidate;
import de.justvotes.accountmanagement.core.model.ContactInvitation;
import de.justvotes.accountmanagement.core.model.ContactOutcome;
import de.justvotes.accountmanagement.core.model.ContactSkipReason;
import de.justvotes.accountmanagement.core.model.Invitation;
import de.justvotes.accountmanagement.core.model.IssuedInvitation;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ContactInvitationsTest {
    private static final String PASSWORD = "correct-horse-battery";
    private final InMemoryAccounts accounts = new InMemoryAccounts();
    private final InMemoryInvitations invitations = new InMemoryInvitations();
    private final MutableClock clock = new MutableClock();
    private final RecordingMailer mailer = new RecordingMailer();
    private final InvitationManagement management = new InvitationManagement(invitations, accounts,
            new FakePasswordHasher(), new SequentialTokens(), mailer, clock);

    private static ContactCandidate contact(int position, String name, String email) {
        return new ContactCandidate(position, Optional.ofNullable(name), Optional.ofNullable(email));
    }

    private List<ContactOutcome> outcomes(ContactCandidate... contacts) {
        return management.assess(List.of(contacts)).stream().map(ContactAssessment::outcome).toList();
    }

    @Test
    void newAddressesAreInvitedAndPreviewCreatesNothing() {
        assertEquals(List.of(ContactOutcome.INVITE, ContactOutcome.INVITE),
                outcomes(contact(1, "Anna", "anna@example.test"), contact(2, "Bert", "bert@example.test")));
        assertTrue(invitations.findAll().isEmpty());
        assertTrue(mailer.sentTokens.isEmpty());
    }

    @Test
    void invitingAContactSuggestsItsNameAsDisplayName() {
        ContactInvitation invited = management.inviteContact("Anna@Example.test", "  Anna Beispiel ");
        assertFalse(invited.renewed());
        Invitation invitation = invited.issued().invitation();
        assertEquals("Anna@Example.test", invitation.email().value());
        assertEquals("Anna Beispiel", invitation.suggestedIdentity().orElseThrow().value());
        assertEquals("Anna Beispiel",
                management.inspect(invited.issued().token().value()).suggestedIdentity().orElseThrow().value());
        assertTrue(management.inviteContact("nameless@example.test", null).issued().invitation().suggestedIdentity().isEmpty());
    }

    @Test
    void importRequiresMailDelivery() {
        mailer.available = false;
        assertThrows(InvitationDeliveryUnavailableException.class,
                () -> management.assess(List.of(contact(1, "Anna", "anna@example.test"))));
        assertThrows(InvitationDeliveryUnavailableException.class, () -> management.inviteContact("anna@example.test", "Anna"));
    }

    @Test
    void everyReasonIsRecognised() {
        IssuedInvitation accepted = management.invite("account@example.test");
        management.accept(accepted.token().value(), "Has Account", PASSWORD);
        management.invite("open@example.test");
        management.invite("revoked@example.test");
        management.revoke(invitations.findOpenByEmailKey("revoked@example.test").orElseThrow().id().orElseThrow());

        assertEquals(List.of(
                        ContactOutcome.MISSING_EMAIL,
                        ContactOutcome.INVALID_EMAIL,
                        ContactOutcome.HAS_ACCOUNT,
                        ContactOutcome.ALREADY_INVITED,
                        ContactOutcome.INVITE,
                        ContactOutcome.INVITE,
                        ContactOutcome.DUPLICATE_IN_FILE),
                outcomes(contact(1, "Ohne", null),
                        contact(2, "Kaputt", "kein-at-zeichen"),
                        contact(3, "Konto", "ACCOUNT@example.test"),
                        contact(4, "Offen", "open@example.test"),
                        contact(5, "Widerrufen", "revoked@example.test"),
                        contact(6, "Neu", "new@example.test"),
                        contact(7, "Neu doppelt", "NEW@example.test")));
    }

    @Test
    void theAdministratorAddressHasAnAccount() {
        management.invite("placeholder@example.test");
        new AccountManagement(accounts, new FakePasswordHasher(), new SequentialTokens(), clock)
                .provisionAdmin("admin@example.test", "{fake}admin-password", false);
        assertEquals(List.of(ContactOutcome.HAS_ACCOUNT), outcomes(contact(1, "Admin", "admin@example.test")));
    }

    @Test
    void expiredInvitationsAreRenewedInsteadOfDuplicated() {
        IssuedInvitation first = management.invite("anna@example.test");
        clock.advance(Duration.ofDays(8));
        assertEquals(List.of(ContactOutcome.RENEW), outcomes(contact(1, "Anna", "anna@example.test")));

        ContactInvitation renewed = management.inviteContact("anna@example.test", "Anna Beispiel");

        assertTrue(renewed.renewed());
        assertEquals(1, invitations.findAll().size());
        Invitation invitation = renewed.issued().invitation();
        assertEquals(clock.now().plus(Invitation.VALIDITY), invitation.expiresAt());
        assertEquals("Anna Beispiel", invitation.suggestedIdentity().orElseThrow().value());
        assertThrows(InvitationNotUsableException.class, () -> management.inspect(first.token().value()));
        assertEquals("anna@example.test", management.inspect(renewed.issued().token().value()).email().value());
    }

    @Test
    void contactsTakenAfterThePreviewAreSkippedWithReason() {
        assertEquals(List.of(ContactOutcome.INVITE), outcomes(contact(1, "Anna", "anna@example.test")));
        IssuedInvitation meanwhile = management.invite("anna@example.test");

        assertEquals(ContactSkipReason.ALREADY_INVITED, assertThrows(ContactSkippedException.class,
                () -> management.inviteContact("anna@example.test", "Anna")).reason());
        management.accept(meanwhile.token().value(), "Anna", PASSWORD);
        assertEquals(ContactSkipReason.HAS_ACCOUNT, assertThrows(ContactSkippedException.class,
                () -> management.inviteContact("ANNA@example.test", "Anna")).reason());
        assertEquals(ContactSkipReason.INVALID_EMAIL, assertThrows(ContactSkippedException.class,
                () -> management.inviteContact("kein-at-zeichen", "Kaputt")).reason());
    }
}
