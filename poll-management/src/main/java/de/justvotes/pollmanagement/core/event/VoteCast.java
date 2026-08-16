package de.justvotes.pollmanagement.core.event;

import de.justvotes.pollmanagement.core.model.Poll;
import de.justvotes.pollmanagement.core.model.Vote;

public record VoteCast(Poll.PollId pollId, Vote vote, String selection) implements PollDomainEvent {
    @Override
    public String actorId() {
        return vote.identity().value();
    }

    @Override
    public String eventType() {
        return "VoteCast";
    }
}
