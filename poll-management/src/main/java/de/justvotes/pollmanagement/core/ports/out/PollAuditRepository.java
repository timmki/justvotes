package de.justvotes.pollmanagement.core.ports.out;

import de.justvotes.pollmanagement.core.model.AuditEntry;
import de.justvotes.pollmanagement.core.model.Poll;

import java.util.List;

public interface PollAuditRepository {
    List<AuditEntry> findByPollId(Poll.PollId pollId);
}
