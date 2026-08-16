package de.justvotes.pollmanagement.core.ports.out;

import de.justvotes.pollmanagement.core.model.Poll;

import java.util.List;
import java.util.Optional;

public interface PollRepository {
    Poll save(Poll poll);

    Optional<Poll> findById(Poll.PollId id);

    List<Poll> findAllByCreator(String creator);

    List<Poll> findAllByVisibility(Poll.Visibility visibility);

    List<Poll> findAllPublicActive();
}
