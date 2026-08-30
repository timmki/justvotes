package de.justvotes.pollmanagement.core.model;

import java.time.Instant;

public record Vote(Identity identity, int optionNumber, Instant votedAt) {
    public Vote(Identity identity, int optionNumber) {
        this(identity, optionNumber, Instant.now());
    }

    public Vote {
        if (identity == null || optionNumber < 1 || votedAt == null) {
            throw new IllegalArgumentException("A vote must have an identity and positive option number.");
        }
    }
}
