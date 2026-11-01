package de.justvotes.accountmanagement.core.model;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * The secret part of an invitation link. It is only held transiently; see {@link InvitationTokenHash}.
 */
public record InvitationToken(String value) {
    private static final int MAX_LENGTH = 256;

    public InvitationToken {
        if (value == null || value.isBlank() || value.length() > MAX_LENGTH) {
            throw new IllegalArgumentException("An invitation token must not be blank.");
        }
    }

    public static InvitationToken of(String value) {
        return new InvitationToken(value);
    }

    public InvitationTokenHash hash() {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return InvitationTokenHash.of(HexFormat.of().formatHex(hashed));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available.", exception);
        }
    }

    @Override
    public String toString() {
        return "InvitationToken[***]";
    }
}
