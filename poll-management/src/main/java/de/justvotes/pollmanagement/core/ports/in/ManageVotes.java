package de.justvotes.pollmanagement.core.ports.in;

import de.justvotes.pollmanagement.core.model.Identity;
import de.justvotes.pollmanagement.core.model.Poll;
import de.justvotes.pollmanagement.core.model.VoteOutcome;

public interface ManageVotes {
    void changeIdentity(Identity oldIdentity, Identity newIdentity);

    VoteOutcome castOrReplace(Poll.PollId pollId, Identity identity, int optionNumber);

    void withdrawVote(Poll.PollId pollId, Identity identity);
}
