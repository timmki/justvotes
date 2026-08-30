package de.justvotes.pollmanagement.core.event;

import de.justvotes.pollmanagement.core.model.Poll;
import de.justvotes.pollmanagement.core.model.Vote;

import java.time.Instant;

public record VoteRemovedByAdmin(
        Poll.PollId pollId,
        Vote vote,
        String selection,
        String adminId,
        String reason,
        Instant occurredAt) implements PollDomainEvent {

    public VoteRemovedByAdmin {
        if (pollId == null || vote == null || adminId == null || adminId.isBlank() || reason == null || reason.isBlank() || occurredAt == null) {
            throw new IllegalArgumentException("An administrative vote removal must be complete.");
        }
    }

    @Override
    public String actorId() {
        return adminId;
    }

    @Override
    public String eventType() {
        return "VoteRemovedByAdmin";
    }

    @Override
    public String reason() {
        return reason;
    }

    @Override
    public Vote affectedVote() {
        return vote;
    }
}
