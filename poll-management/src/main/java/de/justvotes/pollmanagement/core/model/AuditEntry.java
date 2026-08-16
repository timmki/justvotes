package de.justvotes.pollmanagement.core.model;

import java.time.Instant;

public record AuditEntry(String actor, Instant occurredAt, String event, String selection) {
}
