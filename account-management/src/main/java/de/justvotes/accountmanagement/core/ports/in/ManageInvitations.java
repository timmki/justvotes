package de.justvotes.accountmanagement.core.ports.in;

import de.justvotes.accountmanagement.core.model.InvitationId;
import de.justvotes.accountmanagement.core.model.InvitationOverview;
import de.justvotes.accountmanagement.core.model.IssuedInvitation;

import java.util.List;

public interface ManageInvitations {
    IssuedInvitation invite(String email);

    IssuedInvitation resend(InvitationId invitationId);

    void revoke(InvitationId invitationId);

    void recordDelivery(InvitationId invitationId, boolean delivered);

    InvitationOverview invitation(InvitationId invitationId);

    List<InvitationOverview> invitations();
}
