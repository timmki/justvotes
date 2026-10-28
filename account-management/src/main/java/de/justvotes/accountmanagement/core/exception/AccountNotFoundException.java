package de.justvotes.accountmanagement.core.exception;

public final class AccountNotFoundException extends RuntimeException {
    public AccountNotFoundException() {
        super("The account was not found.");
    }
}
