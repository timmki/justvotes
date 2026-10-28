package de.justvotes.accountmanagement.core.exception;

public final class IdentityTakenException extends RuntimeException {
    public IdentityTakenException() {
        super("The identity is already taken.");
    }
}
