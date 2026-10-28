package de.justvotes.adapters.accountmanagement.infra.in.http;

import de.justvotes.accountmanagement.core.model.Account;
import de.justvotes.accountmanagement.core.model.AccountIdentity;
import de.justvotes.accountmanagement.core.model.EmailAddress;
import de.justvotes.accountmanagement.core.model.Invitation;
import de.justvotes.accountmanagement.core.model.InvitationOverview;
import de.justvotes.accountmanagement.core.model.Role;
import de.justvotes.adapters.shared.infra.in.http.AuthenticatedAccount;
import de.justvotes.adapters.shared.infra.in.http.OpaqueIdCodec;
import de.justvotes.api.v1.model.AccountRole;
import de.justvotes.api.v1.model.AccountStatus;
import de.justvotes.api.v1.model.AccountSummary;
import de.justvotes.api.v1.model.CurrentSession;
import de.justvotes.api.v1.model.InvitationStatus;
import de.justvotes.api.v1.model.InvitationSummary;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Locale;

/**
 * Maps accounts and invitations to their HTTP representations.
 */
public final class AccountResponseMapper {
    public static final String ACCOUNT_ID_KIND = "a";
    public static final String INVITATION_ID_KIND = "i";

    private AccountResponseMapper() {
    }

    public static AccountRole role(Role role) {
        return AccountRole.fromValue(role.name().toLowerCase(Locale.ROOT));
    }

    public static CurrentSession session(Account account) {
        return new CurrentSession(account.name().value(), role(account.role()), account.passwordChangeRequired())
                .identity(account.identity().map(AccountIdentity::value).orElse(null));
    }

    public static AuthenticatedAccount authenticated(Account account) {
        return new AuthenticatedAccount(account.id().orElseThrow().value(), account.name().value(),
                role(account.role()).getValue(), account.identity().map(AccountIdentity::value).orElse(null));
    }

    public static AccountSummary summary(Account account) {
        return new AccountSummary(
                OpaqueIdCodec.encode(ACCOUNT_ID_KIND, account.id().orElseThrow().value()),
                account.name().value(),
                role(account.role()),
                AccountStatus.fromValue(account.status().name().toLowerCase(Locale.ROOT)),
                account.passwordChangeRequired(),
                utc(account.createdAt()))
                .identity(account.identity().map(AccountIdentity::value).orElse(null))
                .email(account.email().map(EmailAddress::value).orElse(null));
    }

    public static InvitationSummary summary(InvitationOverview overview) {
        Invitation invitation = overview.invitation();
        return new InvitationSummary(
                OpaqueIdCodec.encode(INVITATION_ID_KIND, invitation.id().orElseThrow().value()),
                invitation.email().value(),
                InvitationStatus.fromValue(overview.state().name().toLowerCase(Locale.ROOT)),
                invitation.deliveryFailed(),
                utc(invitation.issuedAt()),
                utc(invitation.expiresAt()));
    }

    public static OffsetDateTime utc(Instant instant) {
        return OffsetDateTime.ofInstant(instant, ZoneOffset.UTC);
    }
}
