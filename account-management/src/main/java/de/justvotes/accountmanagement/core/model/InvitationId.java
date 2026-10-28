package de.justvotes.accountmanagement.core.model;

public record InvitationId(long value) {
    public InvitationId {
        if (value <= 0) {
            throw new IllegalArgumentException("An invitation ID must be positive.");
        }
    }

    public static InvitationId of(long value) {
        return new InvitationId(value);
    }
}
