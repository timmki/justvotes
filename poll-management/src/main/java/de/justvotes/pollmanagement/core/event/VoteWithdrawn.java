package de.justvotes.pollmanagement.core.event;

import de.justvotes.pollmanagement.core.model.Poll;
import de.justvotes.pollmanagement.core.model.Vote;

import java.time.Instant;

public record VoteWithdrawn(Poll.PollId pollId, Vote vote, String selection, Instant occurredAt) implements PollDomainEvent {
    public VoteWithdrawn {
        if (pollId == null) throw new IllegalArgumentException("A vote withdrawal event must identify its poll.");
        if (vote == null) throw new IllegalArgumentException("A vote withdrawal event must identify its vote.");
        if (occurredAt == null) throw new IllegalArgumentException("A vote withdrawal event must identify its occurrence time.");
    }

    @Override
    public String actorId() {
        return vote.identity().value();
    }

    @Override
    public String eventType() {
        return "VoteWithdrawn";
    }
}
