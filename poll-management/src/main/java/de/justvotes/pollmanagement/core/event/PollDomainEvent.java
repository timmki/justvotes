package de.justvotes.pollmanagement.core.event;

import de.justvotes.pollmanagement.core.model.Poll;

import java.time.Instant;

public interface PollDomainEvent {
    Poll.PollId pollId();

    String actorId();

    String eventType();

    String selection();

    default Instant occurredAt() {
        return Instant.now();
    }
}
