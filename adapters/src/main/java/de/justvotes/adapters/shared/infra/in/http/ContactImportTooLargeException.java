package de.justvotes.adapters.shared.infra.in.http;

/**
 * An uploaded contact file exceeds the size an import accepts.
 */
public final class ContactImportTooLargeException extends RuntimeException {
    public static final int MAX_BYTES = 1024 * 1024;

    public ContactImportTooLargeException() {
        super("The contact file must not be larger than 1 MB.");
    }
}
