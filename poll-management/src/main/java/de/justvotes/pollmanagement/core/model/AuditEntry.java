package de.justvotes.pollmanagement.core.model;

import java.time.Instant;

public record AuditEntry(String actor, Instant occurredAt, String event, String selection,
                         String reason, String voteIdentity, Integer optionNumber, Instant votedAt) {
    public AuditEntry(String actor, Instant occurredAt, String event, String selection) {
        this(actor, occurredAt, event, selection, null, null, null, null);
    }
}
