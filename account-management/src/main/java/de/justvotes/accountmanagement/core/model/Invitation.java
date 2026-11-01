package de.justvotes.accountmanagement.core.model;

import de.justvotes.accountmanagement.core.exception.InvitationNotUsableException;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;

/**
 * A single-use, time-limited permission to create a user account for one email address.
 */
public final class Invitation {
    public static final Duration VALIDITY = Duration.ofDays(7);

    private final InvitationId id;
    private final EmailAddress email;
    private InvitationTokenHash tokenHash;
    private InvitationStatus status;
    private boolean deliveryFailed;
    private Instant issuedAt;
    private Instant expiresAt;
    private Instant acceptedAt;
    private AccountId acceptedAccountId;
    private SuggestedIdentity suggestedIdentity;

    private Invitation(InvitationId id, EmailAddress email, InvitationTokenHash tokenHash, InvitationStatus status,
                       boolean deliveryFailed, Instant issuedAt, Instant expiresAt, Instant acceptedAt,
                       AccountId acceptedAccountId, SuggestedIdentity suggestedIdentity) {
        this.id = id;
        this.email = Objects.requireNonNull(email, "An invitation requires an email address.");
        this.tokenHash = Objects.requireNonNull(tokenHash, "An invitation requires a token hash.");
        this.status = Objects.requireNonNull(status, "An invitation requires a status.");
        this.issuedAt = Objects.requireNonNull(issuedAt, "An invitation requires an issue time.");
        this.expiresAt = Objects.requireNonNull(expiresAt, "An invitation requires an expiry time.");
        this.deliveryFailed = deliveryFailed;
        this.acceptedAt = acceptedAt;
        this.acceptedAccountId = acceptedAccountId;
        if (status != InvitationStatus.OPEN && suggestedIdentity != null) {
            throw new IllegalArgumentException("Only an open invitation keeps a suggested display name.");
        }
        this.suggestedIdentity = suggestedIdentity;
    }

    public static Invitation issue(EmailAddress email, InvitationTokenHash tokenHash, Instant now) {
        return issue(email, tokenHash, now, null);
    }

    /**
     * Issues an invitation that suggests a display name, e.g. the name of an imported contact.
     */
    public static Invitation issue(EmailAddress email, InvitationTokenHash tokenHash, Instant now,
                                   SuggestedIdentity suggestedIdentity) {
        return new Invitation(null, email, tokenHash, InvitationStatus.OPEN, false, now, now.plus(VALIDITY),
                null, null, suggestedIdentity);
    }

    public static Invitation restore(InvitationId id, EmailAddress email, InvitationTokenHash tokenHash,
                                     InvitationStatus status, boolean deliveryFailed, Instant issuedAt,
                                     Instant expiresAt, Instant acceptedAt, AccountId acceptedAccountId,
                                     SuggestedIdentity suggestedIdentity) {
        Objects.requireNonNull(id, "A restored invitation requires an ID.");
        return new Invitation(id, email, tokenHash, status, deliveryFailed, issuedAt, expiresAt, acceptedAt,
                acceptedAccountId, suggestedIdentity);
    }

    public InvitationState state(Instant now) {
        if (status == InvitationStatus.ACCEPTED) {
            return InvitationState.ACCEPTED;
        }
        if (status == InvitationStatus.REVOKED) {
            return InvitationState.REVOKED;
        }
        if (!now.isBefore(expiresAt)) {
            return InvitationState.EXPIRED;
        }
        return InvitationState.OPEN;
    }

    /**
     * An open invitation whose link has run out; it can be renewed instead of issuing a second one.
     */
    public boolean isExpired(Instant now) {
        return state(now) == InvitationState.EXPIRED;
    }

    public boolean isUsable(InvitationTokenHash candidate, Instant now) {
        return state(now) == InvitationState.OPEN && tokenHash.equals(candidate);
    }

    public void ensureUsable(InvitationTokenHash candidate, Instant now) {
        if (!isUsable(candidate, now)) {
            throw new InvitationNotUsableException();
        }
    }

    /**
     * Replaces the token and restarts the validity period; the previous link stops working.
     */
    public void reissue(InvitationTokenHash newTokenHash, Instant now) {
        requireOpen();
        tokenHash = Objects.requireNonNull(newTokenHash, "A new token hash is required.");
        issuedAt = now;
        expiresAt = now.plus(VALIDITY);
        deliveryFailed = false;
    }

    /**
     * Reissues the invitation and replaces the suggested display name, e.g. when a contact file is imported again.
     */
    public void reissue(InvitationTokenHash newTokenHash, Instant now, SuggestedIdentity replacement) {
        reissue(newTokenHash, now);
        suggestedIdentity = replacement;
    }

    public void revoke() {
        requireOpen();
        status = InvitationStatus.REVOKED;
        suggestedIdentity = null;
    }

    public void accept(InvitationTokenHash candidate, AccountId accountId, Instant now) {
        ensureUsable(candidate, now);
        status = InvitationStatus.ACCEPTED;
        acceptedAt = now;
        acceptedAccountId = Objects.requireNonNull(accountId, "An accepted invitation requires the created account.");
        suggestedIdentity = null;
    }

    public void recordDelivery(boolean delivered) {
        if (status != InvitationStatus.OPEN) {
            return;
        }
        deliveryFailed = !delivered;
    }

    private void requireOpen() {
        if (status != InvitationStatus.OPEN) {
            throw new InvitationNotUsableException();
        }
    }

    public Optional<InvitationId> id() {
        return Optional.ofNullable(id);
    }

    public EmailAddress email() {
        return email;
    }

    public InvitationTokenHash tokenHash() {
        return tokenHash;
    }

    public InvitationStatus status() {
        return status;
    }

    public boolean deliveryFailed() {
        return deliveryFailed;
    }

    public Instant issuedAt() {
        return issuedAt;
    }

    public Instant expiresAt() {
        return expiresAt;
    }

    public Optional<Instant> acceptedAt() {
        return Optional.ofNullable(acceptedAt);
    }

    public Optional<AccountId> acceptedAccountId() {
        return Optional.ofNullable(acceptedAccountId);
    }

    public Optional<SuggestedIdentity> suggestedIdentity() {
        return Optional.ofNullable(suggestedIdentity);
    }
}
