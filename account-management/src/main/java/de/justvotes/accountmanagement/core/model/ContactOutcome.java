package de.justvotes.accountmanagement.core.model;

/**
 * What an import would do with a contact. Only {@link #INVITE} and {@link #RENEW} can be selected.
 */
public enum ContactOutcome {
    INVITE,
    RENEW,
    HAS_ACCOUNT,
    ALREADY_INVITED,
    DUPLICATE_IN_FILE,
    MISSING_EMAIL,
    INVALID_EMAIL;

    public boolean selectable() {
        return this == INVITE || this == RENEW;
    }
}
