package de.justvotes.accountmanagement.core.exception;

public final class AccountNameTakenException extends RuntimeException {
    public AccountNameTakenException() {
        super("The account name is already taken.");
    }
}
