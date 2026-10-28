package de.justvotes.accountmanagement.core.exception;

public final class InvalidCredentialsException extends RuntimeException {
    public InvalidCredentialsException() {
        super("The credentials are invalid.");
    }
}
