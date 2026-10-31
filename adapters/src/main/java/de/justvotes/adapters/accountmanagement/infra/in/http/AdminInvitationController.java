package de.justvotes.adapters.accountmanagement.infra.in.http;

import de.justvotes.accountmanagement.core.model.InvitationId;
import de.justvotes.accountmanagement.core.model.InvitationOverview;
import de.justvotes.accountmanagement.core.ports.in.ManageInvitations;
import de.justvotes.adapters.accountmanagement.infra.in.transaction.InvitationDelivery;
import de.justvotes.adapters.shared.infra.in.http.AuthenticatedAccount;
import de.justvotes.adapters.shared.infra.in.http.AuthenticatedAccounts;
import de.justvotes.adapters.shared.infra.in.http.OpaqueIdCodec;
import de.justvotes.adapters.shared.infra.in.http.SecurityEventLogger;
import de.justvotes.api.v1.model.InvitationRequest;
import de.justvotes.api.v1.model.InvitationSummary;
import de.justvotes.api.v1.server.InvitationAdministrationApi;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Locale;

@RestController
public class AdminInvitationController implements InvitationAdministrationApi {
    private static final Locale DEFAULT_LOCALE = Locale.GERMAN;
    private final ManageInvitations invitations;
    private final InvitationDelivery delivery;
    private final SecurityEventLogger securityEvents;

    public AdminInvitationController(ManageInvitations invitations, InvitationDelivery delivery,
                                     SecurityEventLogger securityEvents) {
        this.invitations = invitations;
        this.delivery = delivery;
        this.securityEvents = securityEvents;
    }

    private static InvitationId invitationId(String value) {
        return InvitationId.of(OpaqueIdCodec.decode(AccountResponseMapper.INVITATION_ID_KIND, value));
    }

    private static Locale locale(InvitationRequest request) {
        if (request.getLocale() == null) {
            return DEFAULT_LOCALE;
        }
        return Locale.forLanguageTag(request.getLocale().getValue());
    }

    @Override
    public ResponseEntity<List<InvitationSummary>> invitations() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(invitations.invitations().stream().map(AccountResponseMapper::summary).toList());
    }

    @Override
    public ResponseEntity<InvitationSummary> createInvitation(InvitationRequest request) {
        InvitationOverview created = delivery.invite(request.getEmail(), locale(request));
        AuthenticatedAccount actor = AuthenticatedAccounts.current();
        securityEvents.invitationIssued(created.invitation().id().orElseThrow().value(), actor.accountId());
        return ResponseEntity.status(HttpStatus.CREATED).cacheControl(CacheControl.noStore())
                .body(AccountResponseMapper.summary(created));
    }

    @Override
    public ResponseEntity<InvitationSummary> resendInvitation(String invitationId) {
        InvitationId id = invitationId(invitationId);
        InvitationOverview resent = delivery.resend(id, DEFAULT_LOCALE);
        AuthenticatedAccount actor = AuthenticatedAccounts.current();
        securityEvents.invitationResent(id.value(), actor.accountId());
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(AccountResponseMapper.summary(resent));
    }

    @Override
    public ResponseEntity<Void> revokeInvitation(String invitationId) {
        InvitationId id = invitationId(invitationId);
        invitations.revoke(id);
        AuthenticatedAccount actor = AuthenticatedAccounts.current();
        securityEvents.invitationRevoked(id.value(), actor.accountId());
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }
}
