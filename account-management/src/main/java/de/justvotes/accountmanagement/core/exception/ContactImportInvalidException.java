package de.justvotes.accountmanagement.core.exception;

/**
 * The selected file is not a readable contact file.
 */
public final class ContactImportInvalidException extends RuntimeException {
    public ContactImportInvalidException() {
        super("The file contains no readable contacts.");
    }
}
