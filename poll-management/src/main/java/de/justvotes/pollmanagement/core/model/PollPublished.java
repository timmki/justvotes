package de.justvotes.pollmanagement.core.model;

public record PollPublished(Poll.PollId pollId, String actorId) {
    public PollPublished {
        if (pollId == null) {
            throw new IllegalArgumentException("A published poll event must identify its poll.");
        }
        if (actorId == null || actorId.isBlank())  {
            throw new IllegalArgumentException("A publication actor must not be blank.");
        }
    }
}
