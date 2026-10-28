package de.justvotes.accountmanagement.core.exception;

public final class AccountNotManageableException extends RuntimeException {
    public AccountNotManageableException() {
        super("The account cannot be managed this way.");
    }
}
