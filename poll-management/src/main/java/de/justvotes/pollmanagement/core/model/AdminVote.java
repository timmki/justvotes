package de.justvotes.pollmanagement.core.model;

import java.time.Instant;

public record AdminVote(
        long id,
        Poll.PollId pollId,
        String pollTitle,
        Identity identity,
        int optionNumber,
        String optionText,
        Instant votedAt) {

    public AdminVote {
        if (id <= 0 || pollId == null || pollTitle == null || pollTitle.isBlank() || identity == null || optionNumber < 1 || optionText == null || optionText.isBlank() || votedAt == null) {
            throw new IllegalArgumentException("An administrative vote view must be complete.");
        }
    }
}
