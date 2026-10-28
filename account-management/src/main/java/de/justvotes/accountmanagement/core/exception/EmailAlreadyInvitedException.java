package de.justvotes.accountmanagement.core.exception;

public final class EmailAlreadyInvitedException extends RuntimeException {
    public EmailAlreadyInvitedException() {
        super("The email address already has an account or an open invitation.");
    }
}
