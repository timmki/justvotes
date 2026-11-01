package de.justvotes.accountmanagement.core.exception;

/**
 * More contacts than one import may contain.
 */
public final class ContactImportTooManyException extends RuntimeException {
    public static final int MAX_CONTACTS = 500;

    public ContactImportTooManyException() {
        super("An import may contain at most " + MAX_CONTACTS + " contacts.");
    }
}
