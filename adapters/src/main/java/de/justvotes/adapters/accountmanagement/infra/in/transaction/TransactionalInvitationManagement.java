package de.justvotes.adapters.accountmanagement.infra.in.transaction;

import de.justvotes.accountmanagement.core.InvitationManagement;
import de.justvotes.accountmanagement.core.model.Account;
import de.justvotes.accountmanagement.core.model.InvitationId;
import de.justvotes.accountmanagement.core.model.InvitationOverview;
import de.justvotes.accountmanagement.core.model.InvitationPreview;
import de.justvotes.accountmanagement.core.model.IssuedInvitation;
import de.justvotes.accountmanagement.core.ports.in.AcceptInvitation;
import de.justvotes.accountmanagement.core.ports.in.ManageInvitations;
import de.justvotes.adapters.sqlite.SqliteRetryingTransaction;

import java.util.List;

public class TransactionalInvitationManagement implements ManageInvitations, AcceptInvitation {
    private final InvitationManagement invitations;
    private final SqliteRetryingTransaction transactions;

    public TransactionalInvitationManagement(InvitationManagement invitations, SqliteRetryingTransaction transactions) {
        this.invitations = invitations;
        this.transactions = transactions;
    }

    @Override
    public IssuedInvitation invite(String email) {
        return transactions.execute(() -> invitations.invite(email));
    }

    @Override
    public IssuedInvitation resend(InvitationId invitationId) {
        return transactions.execute(() -> invitations.resend(invitationId));
    }

    @Override
    public void revoke(InvitationId invitationId) {
        transactions.execute(() -> {
            invitations.revoke(invitationId);
            return null;
        });
    }

    @Override
    public void recordDelivery(InvitationId invitationId, boolean delivered) {
        transactions.execute(() -> {
            invitations.recordDelivery(invitationId, delivered);
            return null;
        });
    }

    @Override
    public InvitationOverview invitation(InvitationId invitationId) {
        return transactions.executeReadOnly(() -> invitations.invitation(invitationId));
    }

    @Override
    public List<InvitationOverview> invitations() {
        return transactions.executeReadOnly(invitations::invitations);
    }

    @Override
    public InvitationPreview inspect(String token) {
        return transactions.executeReadOnly(() -> invitations.inspect(token));
    }

    @Override
    public Account accept(String token, String accountName, String identity, String password) {
        return transactions.execute(() -> invitations.accept(token, accountName, identity, password));
    }
}
