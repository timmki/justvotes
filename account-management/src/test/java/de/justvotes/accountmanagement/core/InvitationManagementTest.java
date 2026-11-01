package de.justvotes.accountmanagement.core;

import de.justvotes.accountmanagement.core.TestSupport.MutableClock;
import de.justvotes.accountmanagement.core.TestSupport.RecordingMailer;
import de.justvotes.accountmanagement.core.TestSupport.SequentialTokens;
import de.justvotes.accountmanagement.core.exception.EmailAlreadyInvitedException;
import de.justvotes.accountmanagement.core.exception.IdentityTakenException;
import de.justvotes.accountmanagement.core.exception.InvitationDeliveryUnavailableException;
import de.justvotes.accountmanagement.core.exception.InvitationNotUsableException;
import de.justvotes.accountmanagement.core.exception.PasswordPolicyViolationException;
import de.justvotes.accountmanagement.core.model.Account;
import de.justvotes.accountmanagement.core.model.InvitationId;
import de.justvotes.accountmanagement.core.model.InvitationState;
import de.justvotes.accountmanagement.core.model.IssuedInvitation;
import de.justvotes.accountmanagement.core.model.Role;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class InvitationManagementTest {
    private static final String PASSWORD = "correct-horse-battery";
    private final InMemoryAccounts accounts = new InMemoryAccounts();
    private final InMemoryInvitations invitations = new InMemoryInvitations();
    private final FakePasswordHasher hasher = new FakePasswordHasher();
    private final MutableClock clock = new MutableClock();
    private final RecordingMailer mailer = new RecordingMailer();
    private final InvitationManagement management = new InvitationManagement(invitations, accounts, hasher,
            new SequentialTokens(), mailer, clock);

    @Test
    void reportsTheNewMemberOnceAfterTheAccountIsStored() {
        List<String> joined = new ArrayList<>();
        InvitationManagement reporting = new InvitationManagement(invitations, accounts, hasher,
                new SequentialTokens(), mailer, clock, identity -> {
            assertTrue(accounts.existsByIdentityKey(identity.toLowerCase(Locale.ROOT)));
            joined.add(identity);
        });
        IssuedInvitation issued = reporting.invite("anna@example.test");

        reporting.accept(issued.token().value(), "Anna", PASSWORD);

        assertEquals(List.of("Anna"), joined);
    }

    @Test
    void failsTheAcceptanceWhenTheNewMemberCannotBeHandedOn() {
        InvitationManagement failing = new InvitationManagement(invitations, accounts, hasher,
                new SequentialTokens(), mailer, clock, identity -> {
            throw new IllegalStateException("members group missing");
        });
        IssuedInvitation issued = failing.invite("anna@example.test");

        assertThrows(IllegalStateException.class, () -> failing.accept(issued.token().value(), "Anna", PASSWORD));
    }

    @Test
    void invitationRequiresAvailableDelivery() {
        mailer.available = false;
        assertThrows(InvitationDeliveryUnavailableException.class, () -> management.invite("anna@example.test"));
    }

    @Test
    void rejectsEmailWithOpenInvitationOrExistingAccount() {
        IssuedInvitation issued = management.invite("anna@example.test");
        assertThrows(EmailAlreadyInvitedException.class, () -> management.invite("ANNA@example.test"));

        management.accept(issued.token().value(), "Anna", PASSWORD);
        assertThrows(EmailAlreadyInvitedException.class, () -> management.invite("anna@example.test"));
    }

    @Test
    void acceptCreatesUserAccountAndConsumesInvitation() {
        IssuedInvitation issued = management.invite("anna@example.test");
        String token = issued.token().value();
        assertEquals("anna@example.test", management.inspect(token).email().value());

        Account account = management.accept(token, "Anna", PASSWORD);

        assertEquals(Role.USER, account.role());
        assertEquals("Anna", account.identity().orElseThrow().value());
        assertEquals("anna@example.test", account.email().value());
        InvitationId id = issued.invitation().id().orElseThrow();
        assertEquals(InvitationState.ACCEPTED, management.invitation(id).state());
        assertThrows(InvitationNotUsableException.class, () -> management.inspect(token));
        assertThrows(InvitationNotUsableException.class, () -> management.accept(token, "Anna2", PASSWORD));
        assertThrows(InvitationNotUsableException.class, () -> management.inspect("unknown-token"));
    }

    @Test
    void takenNameOrIdentityLeavesInvitationOpen() {
        String first = management.invite("anna@example.test").token().value();
        management.accept(first, "Anna", PASSWORD);
        IssuedInvitation second = management.invite("bob@example.test");
        String token = second.token().value();

        assertThrows(IdentityTakenException.class, () -> management.accept(token, "anna", PASSWORD));
        assertThrows(PasswordPolicyViolationException.class, () -> management.accept(token, "Bob", "short"));
        assertEquals(InvitationState.OPEN, management.invitation(second.invitation().id().orElseThrow()).state());

        management.accept(token, "Bob", PASSWORD);
    }

    @Test
    void resendInvalidatesPreviousTokenAndRevokeEndsInvitation() {
        IssuedInvitation issued = management.invite("anna@example.test");
        InvitationId id = issued.invitation().id().orElseThrow();
        IssuedInvitation resent = management.resend(id);

        assertThrows(InvitationNotUsableException.class, () -> management.inspect(issued.token().value()));
        assertEquals("anna@example.test", management.inspect(resent.token().value()).email().value());

        management.revoke(id);
        assertEquals(InvitationState.REVOKED, management.invitation(id).state());
        assertThrows(InvitationNotUsableException.class, () -> management.inspect(resent.token().value()));
    }

    @Test
    void expiredInvitationsAreNotUsableButCanBeResent() {
        IssuedInvitation issued = management.invite("anna@example.test");
        InvitationId id = issued.invitation().id().orElseThrow();
        clock.advance(Duration.ofDays(8));

        assertEquals(InvitationState.EXPIRED, management.invitation(id).state());
        assertThrows(InvitationNotUsableException.class, () -> management.inspect(issued.token().value()));
        IssuedInvitation resent = management.resend(id);
        assertEquals(InvitationState.OPEN, management.invitation(id).state());
        management.accept(resent.token().value(), "Anna", PASSWORD);
    }

    @Test
    void recordsDeliveryFailures() {
        InvitationId id = management.invite("anna@example.test").invitation().id().orElseThrow();
        management.recordDelivery(id, false);
        assertTrue(management.invitation(id).invitation().deliveryFailed());
        management.recordDelivery(id, true);
        assertFalse(management.invitation(id).invitation().deliveryFailed());
    }
}
