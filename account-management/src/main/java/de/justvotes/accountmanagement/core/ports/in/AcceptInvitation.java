package de.justvotes.accountmanagement.core.ports.in;

import de.justvotes.accountmanagement.core.model.Account;
import de.justvotes.accountmanagement.core.model.InvitationPreview;

public interface AcceptInvitation {
    InvitationPreview inspect(String token);

    Account accept(String token, String identity, String password);
}
