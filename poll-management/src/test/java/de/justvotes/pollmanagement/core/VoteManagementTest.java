package de.justvotes.pollmanagement.core;

import de.justvotes.pollmanagement.core.event.PollDomainEvent;
import de.justvotes.pollmanagement.core.event.VoteRemovedForIdentityChange;
import de.justvotes.pollmanagement.core.model.Identity;
import de.justvotes.pollmanagement.core.model.Poll;
import de.justvotes.pollmanagement.core.model.Vote;
import de.justvotes.pollmanagement.core.ports.out.PollRepository;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;

class VoteManagementTest {
    private static final Identity OLD_IDENTITY = Identity.of("alice");
    private static final Identity NEW_IDENTITY = Identity.of("bob");

    private static Poll activePollWithVote(Identity identity) {
        Poll poll = Poll.reconstitue(
                Poll.PollId.newId(), "Aktuelle Wahl", "systemadmin", Poll.Visibility.PUBLIC, Poll.State.ACTIVE,
                group(), List.of("Ja"), List.of("Ja"), List.of()
        );
        poll.castOrReplace(identity, 1);
        return poll;
    }

    private static Poll.TemplateGroup group() {
        return Poll.TemplateGroup.of(Poll.TemplateGroupId.of(1), "Wahl");
    }

    @Test
    void removesVotesFromOpenPollsAndRecordsTheOriginalIdentity() {
        Poll firstOpenPoll = activePollWithVote(OLD_IDENTITY);
        Poll secondOpenPoll = activePollWithVote(OLD_IDENTITY);
        Poll closedPoll = Poll.reconstitue(
                Poll.PollId.newId(), "Vergangene Wahl", "systemadmin", Poll.Visibility.PUBLIC, Poll.State.EXPIRED,
                group(), List.of("Ja"), List.of("Ja"), List.of(new Vote(OLD_IDENTITY, 1))
        );
        var polls = new InMemoryPollRepository(firstOpenPoll, secondOpenPoll, closedPoll);
        var events = new ArrayList<PollDomainEvent>();
        VoteManagement management = new VoteManagement(polls, pollId -> List.of(), events::add, java.time.Instant::now);

        management.changeIdentity(OLD_IDENTITY, NEW_IDENTITY);

        assertEquals(List.of(), firstOpenPoll.votes());
        assertEquals(List.of(), secondOpenPoll.votes());
        assertEquals(List.of(new Vote(OLD_IDENTITY, 1)), closedPoll.votes());
        assertEquals(List.of(
                new VoteRemovedForIdentityChange(firstOpenPoll.id(), new Vote(OLD_IDENTITY, 1), "Ja"),
                new VoteRemovedForIdentityChange(secondOpenPoll.id(), new Vote(OLD_IDENTITY, 1), "Ja")
        ), events);
        assertEquals(List.of(firstOpenPoll, secondOpenPoll), polls.saved());
    }

    @Test
    void leavesVotesAndHistoryUntouchedWhenTheIdentityDoesNotChange() {
        Poll openPoll = activePollWithVote(OLD_IDENTITY);
        var polls = new InMemoryPollRepository(openPoll);
        var events = new ArrayList<PollDomainEvent>();
        VoteManagement management = new VoteManagement(polls, pollId -> List.of(), events::add, java.time.Instant::now);

        management.changeIdentity(OLD_IDENTITY, OLD_IDENTITY);

        assertEquals(List.of(new Vote(OLD_IDENTITY, 1)), openPoll.votes());
        assertEquals(List.of(), events);
        assertEquals(List.of(), polls.saved());
    }

    private static final class InMemoryPollRepository implements PollRepository {
        private final List<Poll> polls;
        private final List<Poll> saved = new ArrayList<>();

        private InMemoryPollRepository(Poll... polls) {
            this.polls = List.of(polls);
        }

        @Override
        public Poll save(Poll poll) {
            saved.add(poll);
            return poll;
        }

        @Override
        public Optional<Poll> findById(Poll.PollId id) {
            return polls.stream().filter(poll -> poll.id().equals(id)).findFirst();
        }

        @Override
        public List<Poll> findAllByCreator(String creator) {
            return polls.stream().filter(poll -> poll.createdBy().equals(creator)).toList();
        }

        @Override
        public List<Poll> findAllByVisibility(Poll.Visibility visibility) {
            return polls.stream().filter(poll -> poll.visibility() == visibility).toList();
        }

        @Override
        public List<Poll> findAllPublicActive() {
            return polls.stream().filter(Poll::isPubliclyVisible).toList();
        }

        @Override
        public List<Poll> findAllActive() {
            return polls.stream().filter(poll -> poll.state() == Poll.State.ACTIVE).toList();
        }

        @Override
        public void delete(Poll poll) {
            throw new UnsupportedOperationException();
        }

        private List<Poll> saved() {
            return List.copyOf(saved);
        }
    }
}
