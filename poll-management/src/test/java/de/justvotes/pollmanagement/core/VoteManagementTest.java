package de.justvotes.pollmanagement.core;

import de.justvotes.pollmanagement.core.event.PollDomainEvent;
import de.justvotes.pollmanagement.core.event.VoteRemovedForIdentityChange;
import de.justvotes.pollmanagement.core.exception.ResultsNotAvailableException;
import de.justvotes.pollmanagement.core.model.Identity;
import de.justvotes.pollmanagement.core.model.Poll;
import de.justvotes.pollmanagement.core.model.PollResults;
import de.justvotes.pollmanagement.core.model.Vote;
import de.justvotes.pollmanagement.core.ports.out.PollRepository;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class VoteManagementTest {
    private static final Identity OLD_IDENTITY = Identity.of("alice");
    private static final Identity NEW_IDENTITY = Identity.of("bob");
    private static final Instant VOTE_TIME = Instant.parse("2026-08-01T10:01:00Z");

    private static Poll activePollWithVote(Identity identity) {
        Poll poll = Poll.reconstitue(
                Poll.PollId.newId(), "Aktuelle Wahl", "systemadmin", Poll.Visibility.PUBLIC, Poll.State.ACTIVE,
                group(), List.of("Ja"), List.of("Ja"), List.of()
        );
        poll.castOrReplace(identity, 1, VOTE_TIME);
        return poll;
    }

    private static Poll.TemplateGroup group() {
        return Poll.TemplateGroup.of(Poll.TemplateGroupId.of(1), "Wahl", "");
    }

    @Test
    void removesVotesFromOpenPollsAndRecordsTheOriginalIdentity() {
        Poll firstOpenPoll = activePollWithVote(OLD_IDENTITY);
        Poll secondOpenPoll = activePollWithVote(OLD_IDENTITY);
        Poll closedPoll = Poll.reconstitue(
                Poll.PollId.newId(), "Vergangene Wahl", "systemadmin", Poll.Visibility.PUBLIC, Poll.State.EXPIRED,
                group(), List.of("Ja"), List.of("Ja"), List.of(new Vote(OLD_IDENTITY, 1, VOTE_TIME))
        );
        var polls = new InMemoryPollRepository(firstOpenPoll, secondOpenPoll, closedPoll);
        var events = new ArrayList<PollDomainEvent>();
        VoteManagement management = new VoteManagement(polls, pollId -> List.of(), events::add, Instant::now);

        management.changeIdentity(OLD_IDENTITY, NEW_IDENTITY);

        assertEquals(List.of(), firstOpenPoll.votes());
        assertEquals(List.of(), secondOpenPoll.votes());
        assertEquals(List.of(new Vote(OLD_IDENTITY, 1, VOTE_TIME)), closedPoll.votes());
        assertEquals(List.of(
                new VoteRemovedForIdentityChange(firstOpenPoll.id(), new Vote(OLD_IDENTITY, 1, VOTE_TIME), "Ja"),
                new VoteRemovedForIdentityChange(secondOpenPoll.id(), new Vote(OLD_IDENTITY, 1, VOTE_TIME), "Ja")
        ), events);
        assertEquals(List.of(firstOpenPoll, secondOpenPoll), polls.saved());
    }

    @Test
    void leavesVotesAndHistoryUntouchedWhenTheIdentityDoesNotChange() {
        Poll openPoll = activePollWithVote(OLD_IDENTITY);
        var polls = new InMemoryPollRepository(openPoll);
        var events = new ArrayList<PollDomainEvent>();
        VoteManagement management = new VoteManagement(polls, pollId -> List.of(), events::add, Instant::now);

        management.changeIdentity(OLD_IDENTITY, OLD_IDENTITY);

        assertEquals(List.of(new Vote(OLD_IDENTITY, 1, VOTE_TIME)), openPoll.votes());
        assertEquals(List.of(), events);
        assertEquals(List.of(), polls.saved());
    }

    @Test
    void returnsCurrentVotesWithStableOptionAndVoterOrdering() {
        Instant createdAt = Instant.parse("2026-08-01T10:00:00Z");
        Instant aliceVotedAt = Instant.parse("2026-08-01T10:02:00Z");
        Instant zuluVotedAt = Instant.parse("2026-08-01T10:01:00Z");
        Poll poll = Poll.reconstitue(
                Poll.PollId.newId(), "Aktuelle Wahl", "systemadmin", Poll.Visibility.PUBLIC, Poll.State.ACTIVE,
                createdAt, Instant.parse("2099-01-01T00:00:00Z"), group(), List.of("Ja", "Nein"), List.of("Ja", "Nein"),
                List.of(new Vote(Identity.of("zulu"), 1, zuluVotedAt), new Vote(Identity.of("alice"), 2, aliceVotedAt))
        );
        VoteManagement management = management(poll, Instant.parse("2026-08-01T10:03:00Z"));

        PollResults results = management.results(poll.id(), Identity.of("alice"));

        assertEquals(createdAt, results.createdAt());
        assertEquals(2, results.totalVotes());
        assertEquals(List.of(1, 2), results.options().stream().map(PollResults.OptionResult::number).toList());
        assertEquals(List.of(1, 1), results.options().stream().map(PollResults.OptionResult::voteCount).toList());
        assertEquals(List.of("alice"), results.options().get(1).votes().stream().map(vote -> vote.identity().value()).toList());
        assertEquals(aliceVotedAt, results.options().get(1).votes().get(0).votedAt());
        assertEquals(List.of("zulu"), results.options().get(0).votes().stream().map(vote -> vote.identity().value()).toList());
    }

    @Test
    void onlyAllowsActivePollResultsToTheVoterAndAllowsExpiredResultsWithoutAnIdentity() {
        Poll active = Poll.reconstitue(
                Poll.PollId.newId(), "Aktive Wahl", "systemadmin", Poll.Visibility.PUBLIC, Poll.State.ACTIVE,
                Instant.parse("2026-08-01T10:00:00Z"), Instant.parse("2099-01-01T00:00:00Z"), group(), List.of("Ja"), List.of("Ja"),
                List.of(new Vote(OLD_IDENTITY, 1, Instant.parse("2026-08-01T10:01:00Z")))
        );
        Poll expired = Poll.reconstitue(
                Poll.PollId.newId(), "Vergangene Wahl", "systemadmin", Poll.Visibility.PUBLIC, Poll.State.EXPIRED,
                Instant.parse("2026-08-01T10:00:00Z"), Instant.parse("2026-08-01T09:00:00Z"), group(), List.of("Ja"), List.of("Ja"), List.of()
        );
        VoteManagement management = management(active, expired);

        assertThrows(ResultsNotAvailableException.class, () -> management.results(active.id(), null));
        assertThrows(ResultsNotAvailableException.class, () -> management.results(active.id(), NEW_IDENTITY));
        assertEquals(expired.id(), management.results(expired.id(), null).id());
    }

    private static VoteManagement management(Poll... polls) {
        return management(Instant.now(), polls);
    }

    private static VoteManagement management(Poll poll, Instant now) {
        return management(now, poll);
    }

    private static VoteManagement management(Instant now, Poll... polls) {
        return new VoteManagement(new InMemoryPollRepository(polls), pollId -> List.of(), ignored -> {
        }, () -> now);
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
