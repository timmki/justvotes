package de.justvotes.pollmanagement.core.event;

import de.justvotes.pollmanagement.core.model.Poll.PollId;

import java.time.Instant;

/**
 * A new member was appended as option to a poll that follows the members group.
 */
public record PollOptionAdded(PollId pollId, int optionNumber, String optionText,
                              Instant occurredAt) implements PollDomainEvent {
    public static final String ACTOR = "System";
    public static final String REASON = "member-joined";

    public PollOptionAdded {
        if (pollId == null || optionNumber < 1 || optionText == null || optionText.isBlank() || occurredAt == null) {
            throw new IllegalArgumentException("An added poll option must be complete.");
        }
    }

    @Override
    public String actorId() {
        return ACTOR;
    }

    @Override
    public String eventType() {
        return "PollOptionAdded";
    }

    @Override
    public String selection() {
        return optionText;
    }

    @Override
    public String reason() {
        return REASON;
    }
}
