package de.justvotes.pollmanagement.core.model;

import java.time.Instant;

public record Vote(long id, Identity identity, int optionNumber, Instant votedAt) {
    public Vote(Identity identity, int optionNumber, Instant votedAt) {
        this(0, identity, optionNumber, votedAt);
    }

    public Vote(Identity identity, int optionNumber) {
        this(0, identity, optionNumber, Instant.now());
    }

    public Vote {
        if (id < 0 || identity == null || optionNumber < 1 || votedAt == null) {
            throw new IllegalArgumentException("A vote must have an identity and positive option number.");
        }
    }
}
