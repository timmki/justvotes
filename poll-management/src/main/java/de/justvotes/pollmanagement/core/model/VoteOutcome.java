package de.justvotes.pollmanagement.core.model;

public record VoteOutcome(Status status, Vote vote) {
    public enum Status {CREATED, REPLACED, UNCHANGED}
}
