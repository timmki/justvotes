package de.justvotes.pollmanagement.core.ports.in;

import de.justvotes.pollmanagement.core.model.*;

import java.util.List;
import java.util.Optional;

public interface ViewVotes {
    Optional<Vote> currentVote(Poll.PollId pollId, Identity identity);

    PollResults results(Poll.PollId pollId, Identity identity);

    List<AuditEntry> publicAudit(Poll.PollId pollId);
}
