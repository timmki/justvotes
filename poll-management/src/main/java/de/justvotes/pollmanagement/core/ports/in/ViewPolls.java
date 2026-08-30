package de.justvotes.pollmanagement.core.ports.in;

import de.justvotes.pollmanagement.core.model.Poll;
import de.justvotes.pollmanagement.core.model.PollSummary;

import java.util.List;

public interface ViewPolls {
    List<Poll> draftsCreatedBy(String systemAdmin);

    List<PollSummary> publicPolls();

    Poll publicPoll(Poll.PollId pollId);

    List<Poll> pollsCreatedBy(String systemAdmin);
}
