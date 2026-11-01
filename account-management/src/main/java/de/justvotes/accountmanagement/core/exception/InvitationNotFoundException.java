package de.justvotes.accountmanagement.core.exception;

public final class InvitationNotFoundException extends RuntimeException {
    public InvitationNotFoundException() {
        super("The invitation was not found.");
    }
}
