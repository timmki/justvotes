package de.justvotes.accountmanagement.core.model;

import java.util.regex.Pattern;

/**
 * SHA-256 hex digest of an invitation token; only the digest is persisted.
 */
public record InvitationTokenHash(String value) {
    private static final Pattern HEX = Pattern.compile("[0-9a-f]{64}");

    public InvitationTokenHash {
        if (value == null || !HEX.matcher(value).matches()) {
            throw new IllegalArgumentException("An invitation token hash must be a lowercase SHA-256 hex digest.");
        }
    }

    public static InvitationTokenHash of(String value) {
        return new InvitationTokenHash(value);
    }
}
