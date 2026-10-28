package de.justvotes.accountmanagement.core.model;

import java.time.Instant;

public record InvitationPreview(EmailAddress email, Instant expiresAt) {
}
