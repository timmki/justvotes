package de.justvotes.accountmanagement.core.model;

import de.justvotes.accountmanagement.core.exception.InvitationNotUsableException;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class InvitationTest {
    private static final Instant NOW = Instant.parse("2026-10-27T10:00:00Z");
    private static final InvitationTokenHash FIRST = InvitationToken.of("first").hash();
    private static final InvitationTokenHash SECOND = InvitationToken.of("second").hash();

    private Invitation invitation() {
        return Invitation.issue(EmailAddress.of("anna@example.test"), FIRST, NOW);
    }

    @Test
    void expiresSevenDaysAfterIssue() {
        Invitation invitation = invitation();
        assertEquals(NOW.plus(Duration.ofDays(7)), invitation.expiresAt());
        assertEquals(InvitationState.OPEN, invitation.state(NOW.plus(Duration.ofDays(7)).minusSeconds(1)));
        assertEquals(InvitationState.EXPIRED, invitation.state(NOW.plus(Duration.ofDays(7))));
        assertFalse(invitation.isUsable(FIRST, NOW.plus(Duration.ofDays(8))));
    }

    @Test
    void reissueReplacesTokenRestartsValidityAndClearsDeliveryFailure() {
        Invitation invitation = invitation();
        invitation.recordDelivery(false);
        assertTrue(invitation.deliveryFailed());
        Instant later = NOW.plus(Duration.ofDays(10));

        invitation.reissue(SECOND, later);

        assertFalse(invitation.isUsable(FIRST, later));
        assertTrue(invitation.isUsable(SECOND, later));
        assertEquals(later.plus(Invitation.VALIDITY), invitation.expiresAt());
        assertFalse(invitation.deliveryFailed());
    }

    @Test
    void revokeOnlyFromOpen() {
        Invitation invitation = invitation();
        invitation.revoke();
        assertEquals(InvitationState.REVOKED, invitation.state(NOW));
        assertThrows(InvitationNotUsableException.class, invitation::revoke);
        assertThrows(InvitationNotUsableException.class, () -> invitation.reissue(SECOND, NOW));
    }

    @Test
    void acceptOnlyOpenNotExpiredAndMatchingToken() {
        Invitation invitation = invitation();
        assertThrows(InvitationNotUsableException.class, () -> invitation.accept(SECOND, AccountId.of(5), NOW));
        assertThrows(InvitationNotUsableException.class,
                () -> invitation.accept(FIRST, AccountId.of(5), NOW.plus(Duration.ofDays(7))));

        invitation.accept(FIRST, AccountId.of(5), NOW);

        assertEquals(InvitationState.ACCEPTED, invitation.state(NOW));
        assertEquals(AccountId.of(5), invitation.acceptedAccountId().orElseThrow());
        assertThrows(InvitationNotUsableException.class, () -> invitation.accept(FIRST, AccountId.of(6), NOW));
    }

    @Test
    void suggestionIsKeptOrReplacedOnReissueAndClearedOnAcceptOrRevoke() {
        SuggestedIdentity anna = SuggestedIdentity.of("Anna Beispiel");
        Invitation invitation = Invitation.issue(EmailAddress.of("anna@example.test"), FIRST, NOW, anna);
        assertEquals(anna, invitation.suggestedIdentity().orElseThrow());

        invitation.reissue(SECOND, NOW);
        assertEquals(anna, invitation.suggestedIdentity().orElseThrow());
        invitation.reissue(FIRST, NOW, SuggestedIdentity.of("Anna B."));
        assertEquals("Anna B.", invitation.suggestedIdentity().orElseThrow().value());

        invitation.accept(FIRST, AccountId.of(5), NOW);
        assertTrue(invitation.suggestedIdentity().isEmpty());

        Invitation revoked = Invitation.issue(EmailAddress.of("bert@example.test"), SECOND, NOW, anna);
        revoked.revoke();
        assertTrue(revoked.suggestedIdentity().isEmpty());
    }

    @Test
    void expiredOnlyAfterTheValidityPeriodOfAnOpenInvitation() {
        Invitation invitation = invitation();
        assertFalse(invitation.isExpired(NOW.plus(Duration.ofDays(7)).minusSeconds(1)));
        assertTrue(invitation.isExpired(NOW.plus(Duration.ofDays(7))));
        invitation.revoke();
        assertFalse(invitation.isExpired(NOW.plus(Duration.ofDays(8))));
    }
}
