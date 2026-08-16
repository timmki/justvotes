package de.justvotes.pollmanagement.core.event;

import de.justvotes.pollmanagement.core.model.Poll;

public record PollPublished(Poll.PollId pollId, String actorId) implements PollDomainEvent {
    public PollPublished {
        if (pollId == null) {
            throw new IllegalArgumentException("A published poll event must identify its poll.");
        }
        if (actorId == null || actorId.isBlank()) {
            throw new IllegalArgumentException("A publication actor must not be blank.");
        }
    }

    @Override
    public String eventType() {
        return "PollPublished";
    }

    @Override
    public String selection() {
        return null;
    }
}
