package de.justvotes.pollmanagement.core.ports.in;

import de.justvotes.pollmanagement.core.model.Identity;
import de.justvotes.pollmanagement.core.model.Poll.PollId;
import de.justvotes.pollmanagement.core.model.VoteOutcome;

public interface ManageVotes {
    VoteOutcome castOrReplace(PollId pollId, Identity identity, int optionNumber);

    void withdrawVote(PollId pollId, Identity identity);
}
