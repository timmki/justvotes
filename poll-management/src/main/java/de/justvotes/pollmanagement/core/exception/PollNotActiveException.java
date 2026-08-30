package de.justvotes.pollmanagement.core.exception;

import de.justvotes.pollmanagement.core.model.Poll;

public final class PollNotActiveException extends RuntimeException {
    public PollNotActiveException(Poll.State state) {
        super("Poll is not active: " + state.name().toLowerCase());
    }
}
