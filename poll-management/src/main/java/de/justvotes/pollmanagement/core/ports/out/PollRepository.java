package de.justvotes.pollmanagement.core.ports.out;

import de.justvotes.pollmanagement.core.model.AdminVotePage;
import de.justvotes.pollmanagement.core.model.Poll;
import de.justvotes.pollmanagement.core.model.Poll.PollId;
import de.justvotes.pollmanagement.core.model.Poll.Visibility;
import de.justvotes.pollmanagement.core.model.PollSummary;

import java.util.List;
import java.util.Optional;

public interface PollRepository {
    Poll save(Poll poll);

    Optional<Poll> findById(PollId id);

    List<Poll> findAllByCreator(String creator);

    List<Poll> findAllByVisibility(Visibility visibility);

    List<PollSummary> findAllPublicSummaries();

    List<Poll> findAllPublicActive();

    List<Poll> findAllActive();

    AdminVotePage findAdminVotes(int page, int size);

    Optional<Poll> findByVoteId(long voteId);

    void delete(Poll poll);
}
