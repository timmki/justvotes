package de.justvotes.bootstrap.config;

import de.justvotes.accountmanagement.core.model.EmailAddress;
import de.justvotes.accountmanagement.core.model.InvitationToken;
import de.justvotes.accountmanagement.core.ports.out.InvitationMailer;

import java.time.Instant;
import java.util.Locale;

/**
 * Used when no mail server or public address is configured; invitations are then rejected.
 */
final class UnavailableInvitationMailer implements InvitationMailer {
    @Override
    public boolean isAvailable() {
        return false;
    }

    @Override
    public void send(EmailAddress recipient, InvitationToken token, Instant expiresAt, Locale locale) {
        throw new IllegalStateException("Mail delivery is not configured.");
    }
}
