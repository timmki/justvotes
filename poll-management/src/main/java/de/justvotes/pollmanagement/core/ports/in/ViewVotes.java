package de.justvotes.pollmanagement.core.ports.in;

import de.justvotes.pollmanagement.core.model.AuditEntry;
import de.justvotes.pollmanagement.core.model.Identity;
import de.justvotes.pollmanagement.core.model.Poll;
import de.justvotes.pollmanagement.core.model.Vote;

import java.util.List;
import java.util.Optional;

public interface ViewVotes {
    Optional<Vote> currentVote(Poll.PollId pollId, Identity identity);

    List<AuditEntry> publicAudit(Poll.PollId pollId);
}
