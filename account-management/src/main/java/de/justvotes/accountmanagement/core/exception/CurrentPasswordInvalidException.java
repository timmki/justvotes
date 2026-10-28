package de.justvotes.accountmanagement.core.exception;

public final class CurrentPasswordInvalidException extends RuntimeException {
    public CurrentPasswordInvalidException() {
        super("The current password is invalid.");
    }
}
