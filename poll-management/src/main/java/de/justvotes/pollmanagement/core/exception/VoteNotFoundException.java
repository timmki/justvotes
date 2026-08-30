package de.justvotes.pollmanagement.core.exception;

public final class VoteNotFoundException extends RuntimeException {
    public VoteNotFoundException(long voteId) {
        super("Vote not found: " + voteId);
    }
}
