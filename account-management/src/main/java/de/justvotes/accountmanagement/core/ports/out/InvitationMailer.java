package de.justvotes.accountmanagement.core.ports.out;

import de.justvotes.accountmanagement.core.model.EmailAddress;
import de.justvotes.accountmanagement.core.model.InvitationToken;

import java.time.Instant;
import java.util.Locale;

public interface InvitationMailer {
    /**
     * Whether a mail server and the public application address are configured.
     */
    boolean isAvailable();

    void send(EmailAddress recipient, InvitationToken token, Instant expiresAt, Locale locale);
}
