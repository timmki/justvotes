package de.justvotes.accountmanagement.core.model;

/**
 * A freshly issued or reissued invitation together with its secret token for delivery.
 */
public record IssuedInvitation(Invitation invitation, InvitationToken token) {
}
