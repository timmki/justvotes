package de.justvotes.accountmanagement.core.model;

/**
 * The status shown to administrators; {@code EXPIRED} is derived from an open invitation's deadline.
 */
public enum InvitationState {
    OPEN,
    EXPIRED,
    ACCEPTED,
    REVOKED
}
