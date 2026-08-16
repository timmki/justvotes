package de.justvotes.pollmanagement.core.event;

import de.justvotes.pollmanagement.core.model.Poll;

public interface PollDomainEvent {
    Poll.PollId pollId();

    String actorId();

    String eventType();

    String selection();
}
