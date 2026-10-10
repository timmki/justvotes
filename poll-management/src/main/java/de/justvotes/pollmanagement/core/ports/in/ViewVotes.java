package de.justvotes.pollmanagement.core.ports.in;

import de.justvotes.pollmanagement.core.model.*;
import de.justvotes.pollmanagement.core.model.Poll.PollId;

import java.util.List;
import java.util.Optional;

public interface ViewVotes {
    List<PersonalVote> currentVotes(Identity identity);

    Optional<Vote> currentVote(PollId pollId, Identity identity);

    PollResults results(PollId pollId, Identity identity);

    List<AuditEntry> publicAudit(PollId pollId);
}
