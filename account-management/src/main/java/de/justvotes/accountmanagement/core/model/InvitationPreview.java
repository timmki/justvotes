package de.justvotes.accountmanagement.core.model;

import java.time.Instant;
import java.util.Optional;

public record InvitationPreview(EmailAddress email, Instant expiresAt, Optional<SuggestedIdentity> suggestedIdentity) {
}
