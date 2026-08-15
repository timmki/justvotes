package de.justvotes.pollmanagement.core.exception;

import de.justvotes.pollmanagement.core.model.Poll;

public final class PollNotFoundException extends RuntimeException {
    public PollNotFoundException(Poll.PollId id) {
        super("Poll not found: " + id.value());
    }
}
