package de.justvotes.accountmanagement.core.exception;

import de.justvotes.accountmanagement.core.model.ContactSkipReason;

/**
 * A selected contact can no longer be invited, for example because it got an account after the preview.
 */
public final class ContactSkippedException extends RuntimeException {
    private final ContactSkipReason reason;

    public ContactSkippedException(ContactSkipReason reason) {
        super("The contact was skipped: " + reason);
        this.reason = reason;
    }

    public ContactSkipReason reason() {
        return reason;
    }
}
