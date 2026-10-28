package de.justvotes.accountmanagement.core.exception;

public final class InvitationDeliveryUnavailableException extends RuntimeException {
    public InvitationDeliveryUnavailableException() {
        super("Invitations cannot be delivered because mail delivery is not configured.");
    }
}
