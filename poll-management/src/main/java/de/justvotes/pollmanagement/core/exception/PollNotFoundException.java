package de.justvotes.pollmanagement.core.exception;

import de.justvotes.pollmanagement.core.model.Poll;
import de.justvotes.pollmanagement.core.model.Poll.PollId;

public final class PollNotFoundException extends RuntimeException {
    public PollNotFoundException(PollId id) {
        super("Poll not found: " + id.value());
    }
}
