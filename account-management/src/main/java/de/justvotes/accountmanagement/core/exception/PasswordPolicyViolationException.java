package de.justvotes.accountmanagement.core.exception;

public final class PasswordPolicyViolationException extends RuntimeException {
    public PasswordPolicyViolationException(String message) {
        super(message);
    }
}
