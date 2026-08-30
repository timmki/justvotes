package de.justvotes.pollmanagement.core.event;

import de.justvotes.pollmanagement.core.model.Poll;
import de.justvotes.pollmanagement.core.model.Vote;

import java.time.Instant;

public interface PollDomainEvent {
    Poll.PollId pollId();

    String actorId();

    String eventType();

    String selection();

    default Instant occurredAt() {
        return Instant.now();
    }

    default String reason() {
        return null;
    }

    default Vote affectedVote() {
        return null;
    }
}
