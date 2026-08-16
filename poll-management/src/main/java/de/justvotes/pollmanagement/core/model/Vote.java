package de.justvotes.pollmanagement.core.model;

public record Vote(Identity identity, int optionNumber) {
    public Vote {
        if (identity == null || optionNumber < 1) {
            throw new IllegalArgumentException("A vote must have an identity and positive option number.");
        }
    }
}
