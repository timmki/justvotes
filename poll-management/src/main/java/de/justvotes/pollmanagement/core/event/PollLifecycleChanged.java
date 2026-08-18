package de.justvotes.pollmanagement.core.event;

import de.justvotes.pollmanagement.core.model.Poll;

public record PollLifecycleChanged(Poll.PollId pollId, String actorId, Type type,
                                   String detail) implements PollDomainEvent {
    public PollLifecycleChanged {
        if (pollId == null) throw new IllegalArgumentException("A poll lifecycle event must identify its poll.");
        if (actorId == null || actorId.isBlank())
            throw new IllegalArgumentException("A poll lifecycle actor must not be blank.");
    }

    @Override
    public String eventType() {
        return type.name();
    }

    @Override
    public String selection() {
        return detail;
    }

    public enum Type {PollExpired, PollArchived, PollRestoredFromArchive, PollExpiryChanged, PollReopened, PollSoftDeleted, PollRestored}
}
