package de.justvotes.pollmanagement.core.event;

import de.justvotes.pollmanagement.core.model.Poll.PollId;
import de.justvotes.pollmanagement.core.model.Vote;

public record VoteRemovedForIdentityChange(PollId pollId, Vote vote, String selection) implements PollDomainEvent {
    @Override
    public String actorId() {
        return vote.identity().value();
    }

    @Override
    public String eventType() {
        return "VoteRemovedForIdentityChange";
    }
}
