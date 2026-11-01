package de.justvotes.accountmanagement.core.exception;

public final class InvitationNotUsableException extends RuntimeException {
    public InvitationNotUsableException() {
        super("The invitation is not usable.");
    }
}
