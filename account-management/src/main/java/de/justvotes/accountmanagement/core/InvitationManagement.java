package de.justvotes.accountmanagement.core;

import de.justvotes.accountmanagement.core.exception.EmailAlreadyInvitedException;
import de.justvotes.accountmanagement.core.ports.in.InviteContacts;
import de.justvotes.accountmanagement.core.model.SuggestedIdentity;
import de.justvotes.accountmanagement.core.model.ContactSkipReason;
import de.justvotes.accountmanagement.core.model.ContactOutcome;
import de.justvotes.accountmanagement.core.model.ContactInvitation;
import de.justvotes.accountmanagement.core.model.ContactCandidate;
import de.justvotes.accountmanagement.core.model.ContactAssessment;
import de.justvotes.accountmanagement.core.exception.ContactSkippedException;
import de.justvotes.accountmanagement.core.exception.IdentityTakenException;
import de.justvotes.accountmanagement.core.exception.InvitationDeliveryUnavailableException;
import de.justvotes.accountmanagement.core.exception.InvitationNotFoundException;
import de.justvotes.accountmanagement.core.exception.InvitationNotUsableException;
import de.justvotes.accountmanagement.core.model.Account;
import de.justvotes.accountmanagement.core.model.AccountId;
import de.justvotes.accountmanagement.core.model.AccountIdentity;
import de.justvotes.accountmanagement.core.model.EmailAddress;
import de.justvotes.accountmanagement.core.model.Invitation;
import de.justvotes.accountmanagement.core.model.InvitationId;
import de.justvotes.accountmanagement.core.model.InvitationOverview;
import de.justvotes.accountmanagement.core.model.InvitationPreview;
import de.justvotes.accountmanagement.core.model.InvitationToken;
import de.justvotes.accountmanagement.core.model.InvitationTokenHash;
import de.justvotes.accountmanagement.core.model.IssuedInvitation;
import de.justvotes.accountmanagement.core.model.Password;
import de.justvotes.accountmanagement.core.ports.in.AcceptInvitation;
import de.justvotes.accountmanagement.core.ports.in.ManageInvitations;
import de.justvotes.accountmanagement.core.ports.out.AccountRepository;
import de.justvotes.accountmanagement.core.ports.out.InvitationMailer;
import de.justvotes.accountmanagement.core.ports.out.InvitationRepository;
import de.justvotes.accountmanagement.core.ports.out.MemberJoinedListener;
import de.justvotes.accountmanagement.core.ports.out.PasswordHasher;
import de.justvotes.accountmanagement.core.ports.out.TokenGenerator;
import de.justvotes.accountmanagement.core.ports.out.UtcClock;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;

public final class InvitationManagement implements ManageInvitations, AcceptInvitation, InviteContacts {
    private final InvitationRepository invitations;
    private final AccountRepository accounts;
    private final PasswordHasher hasher;
    private final TokenGenerator tokens;
    private final InvitationMailer mailer;
    private final UtcClock clock;
    private final ContactInvitations contacts;
    private final MemberJoinedListener members;

    public InvitationManagement(InvitationRepository invitations, AccountRepository accounts, PasswordHasher hasher,
                                TokenGenerator tokens, InvitationMailer mailer, UtcClock clock) {
        this(invitations, accounts, hasher, tokens, mailer, clock, identity -> {
        });
    }

    public InvitationManagement(InvitationRepository invitations, AccountRepository accounts, PasswordHasher hasher,
                                TokenGenerator tokens, InvitationMailer mailer, UtcClock clock, MemberJoinedListener members) {
        this.members = members;
        this.invitations = invitations;
        this.accounts = accounts;
        this.hasher = hasher;
        this.tokens = tokens;
        this.mailer = mailer;
        this.clock = clock;
        this.contacts = new ContactInvitations(accounts, invitations);
    }

    @Override
    public IssuedInvitation invite(String email) {
        if (!mailer.isAvailable()) {
            throw new InvitationDeliveryUnavailableException();
        }
        EmailAddress address = EmailAddress.of(email);
        if (accounts.existsByEmailKey(address.normalized()) || invitations.existsOpenByEmailKey(address.normalized())) {
            throw new EmailAlreadyInvitedException();
        }
        InvitationToken token = tokens.invitationToken();
        Invitation saved = invitations.save(Invitation.issue(address, token.hash(), clock.now()));
        return new IssuedInvitation(saved, token);
    }

    @Override
    public IssuedInvitation resend(InvitationId invitationId) {
        if (!mailer.isAvailable()) {
            throw new InvitationDeliveryUnavailableException();
        }
        Invitation invitation = load(invitationId);
        InvitationToken token = tokens.invitationToken();
        invitation.reissue(token.hash(), clock.now());
        return new IssuedInvitation(invitations.save(invitation), token);
    }

    @Override
    public void revoke(InvitationId invitationId) {
        Invitation invitation = load(invitationId);
        invitation.revoke();
        invitations.save(invitation);
    }

    @Override
    public void recordDelivery(InvitationId invitationId, boolean delivered) {
        Invitation invitation = load(invitationId);
        invitation.recordDelivery(delivered);
        invitations.save(invitation);
    }

    @Override
    public InvitationOverview invitation(InvitationId invitationId) {
        Invitation invitation = load(invitationId);
        return new InvitationOverview(invitation, invitation.state(clock.now()));
    }

    @Override
    public List<InvitationOverview> invitations() {
        Instant now = clock.now();
        return invitations.findAll().stream()
                .sorted(Comparator.comparing(Invitation::issuedAt).reversed())
                .map(invitation -> new InvitationOverview(invitation, invitation.state(now)))
                .toList();
    }

    @Override
    public InvitationPreview inspect(String token) {
        Invitation invitation = usable(token);
        return new InvitationPreview(invitation.email(), invitation.expiresAt(), invitation.suggestedIdentity());
    }

    @Override
    public Account accept(String token, String identity, String password) {
        InvitationTokenHash tokenHash = tokenHash(token);
        Invitation invitation = usable(token);
        AccountIdentity accountIdentity = AccountIdentity.of(identity);
        Password newPassword = AccountManagement.newPassword(password);
        if (accounts.existsByIdentityKey(accountIdentity.normalized())) {
            throw new IdentityTakenException();
        }
        if (accounts.existsByEmailKey(invitation.email().normalized())) {
            throw new EmailAlreadyInvitedException();
        }
        Instant now = clock.now();
        Account created = accounts.save(Account.createUser(accountIdentity, invitation.email(),
                hasher.hash(newPassword.value()), now));
        AccountId createdId = created.id().orElseThrow();
        invitation.accept(tokenHash, createdId, now);
        invitations.save(invitation);
        members.memberJoined(accountIdentity.value());
        return created;
    }

    @Override
    public List<ContactAssessment> assess(List<ContactCandidate> candidates) {
        requireDelivery();
        return contacts.assess(candidates, clock.now());
    }

    @Override
    public ContactInvitation inviteContact(String email, String name) {
        requireDelivery();
        EmailAddress address = ContactInvitations.validEmail(email)
                .orElseThrow(() -> new ContactSkippedException(ContactSkipReason.INVALID_EMAIL));
        Instant now = clock.now();
        SuggestedIdentity suggestion = SuggestedIdentity.fromContactName(name).orElse(null);
        ContactOutcome outcome = contacts.outcome(address, now);
        if (outcome == ContactOutcome.HAS_ACCOUNT) {
            throw new ContactSkippedException(ContactSkipReason.HAS_ACCOUNT);
        }
        if (outcome == ContactOutcome.ALREADY_INVITED) {
            throw new ContactSkippedException(ContactSkipReason.ALREADY_INVITED);
        }
        InvitationToken token = tokens.invitationToken();
        if (outcome == ContactOutcome.RENEW) {
            Invitation expired = invitations.findOpenByEmailKey(address.normalized()).orElseThrow();
            expired.reissue(token.hash(), now, suggestion);
            return new ContactInvitation(new IssuedInvitation(invitations.save(expired), token), true);
        }
        Invitation created = invitations.save(Invitation.issue(address, token.hash(), now, suggestion));
        return new ContactInvitation(new IssuedInvitation(created, token), false);
    }

    private void requireDelivery() {
        if (!mailer.isAvailable()) {
            throw new InvitationDeliveryUnavailableException();
        }
    }

    private Invitation usable(String token) {
        InvitationTokenHash tokenHash = tokenHash(token);
        Invitation invitation = invitations.findByTokenHash(tokenHash).orElseThrow(InvitationNotUsableException::new);
        invitation.ensureUsable(tokenHash, clock.now());
        return invitation;
    }

    private static InvitationTokenHash tokenHash(String token) {
        try {
            return InvitationToken.of(token).hash();
        } catch (IllegalArgumentException exception) {
            throw new InvitationNotUsableException();
        }
    }

    private Invitation load(InvitationId invitationId) {
        return invitations.findById(invitationId).orElseThrow(InvitationNotFoundException::new);
    }
}
