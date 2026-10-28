package de.justvotes.accountmanagement.core.ports.out;

import de.justvotes.accountmanagement.core.model.InvitationToken;

public interface TokenGenerator {
    InvitationToken invitationToken();

    String oneTimePassword();
}
