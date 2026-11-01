package de.justvotes.adapters.accountmanagement.infra.in.transaction;

import de.justvotes.accountmanagement.core.model.Invitation;
import de.justvotes.accountmanagement.core.model.InvitationId;
import de.justvotes.accountmanagement.core.model.InvitationOverview;
import de.justvotes.accountmanagement.core.model.IssuedInvitation;
import de.justvotes.accountmanagement.core.ports.in.ManageInvitations;
import de.justvotes.accountmanagement.core.ports.out.InvitationMailer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Locale;

/**
 * Sends invitation emails only after the invitation has been committed and records failed deliveries
 * in a separate transaction, so a mail outage never rolls back or blocks the invitation itself.
 */
public final class InvitationDelivery {
    private static final Logger LOG = LoggerFactory.getLogger(InvitationDelivery.class);
    private final ManageInvitations invitations;
    private final InvitationMailer mailer;

    public InvitationDelivery(ManageInvitations invitations, InvitationMailer mailer) {
        this.invitations = invitations;
        this.mailer = mailer;
    }

    public InvitationOverview invite(String email, Locale locale) {
        return deliver(invitations.invite(email), locale);
    }

    public InvitationOverview resend(InvitationId invitationId, Locale locale) {
        return deliver(invitations.resend(invitationId), locale);
    }

    /**
     * Sends the email for an invitation that has already been committed, e.g. one created by a contact import.
     */
    public InvitationOverview deliver(IssuedInvitation issued, Locale locale) {
        Invitation invitation = issued.invitation();
        InvitationId id = invitation.id().orElseThrow();
        try {
            mailer.send(invitation.email(), issued.token(), invitation.expiresAt(), locale);
        } catch (RuntimeException exception) {
            LOG.warn("Invitation {} could not be delivered: {}", id.value(), exception.getClass().getSimpleName());
            invitations.recordDelivery(id, false);
        }
        return invitations.invitation(id);
    }
}
