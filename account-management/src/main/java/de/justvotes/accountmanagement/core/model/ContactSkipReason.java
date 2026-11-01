package de.justvotes.accountmanagement.core.model;

/**
 * Why a selected contact was not invited when the import was confirmed.
 */
public enum ContactSkipReason {
    HAS_ACCOUNT,
    ALREADY_INVITED,
    INVALID_EMAIL,
    DUPLICATE_IN_REQUEST
}
