package de.justvotes.pollmanagement.core.model;

import java.time.Instant;
import java.util.Objects;

/** A current vote enriched only with publicly readable poll and option information. */
public record PersonalVote(Poll.PollId pollId, String pollTitle, Poll.State pollState,
                           int optionNumber, String optionText, Instant votedAt) {
    public PersonalVote {
        Objects.requireNonNull(pollId);
        Objects.requireNonNull(pollTitle);
        Objects.requireNonNull(optionText);
        Objects.requireNonNull(votedAt);
        if (pollState != Poll.State.ACTIVE && pollState != Poll.State.EXPIRED && pollState != Poll.State.ARCHIVED) {
            throw new IllegalArgumentException("A personal vote must belong to a publicly readable lifecycle.");
        }
        if (optionNumber < 1 || pollTitle.isBlank() || optionText.isBlank()) {
            throw new IllegalArgumentException("A personal vote requires a poll title and an existing option.");
        }
    }

    public static PersonalVote from(Poll poll, Vote vote, Poll.Option option) {
        if (!poll.isPubliclyReadable() || !poll.options().contains(option) || option.number() != vote.optionNumber()
                || !poll.votes().contains(vote)) {
            throw new IllegalArgumentException("A personal vote requires an existing readable poll, vote and option.");
        }
        return new PersonalVote(poll.id(), poll.title(), poll.state(), option.number(), option.text(), vote.votedAt());
    }
}
