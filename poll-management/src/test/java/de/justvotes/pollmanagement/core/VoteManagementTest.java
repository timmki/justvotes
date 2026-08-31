package de.justvotes.pollmanagement.core;

import de.justvotes.pollmanagement.core.event.PollDomainEvent;
import de.justvotes.pollmanagement.core.event.VoteRemovedByAdmin;
import de.justvotes.pollmanagement.core.event.VoteRemovedForIdentityChange;
import de.justvotes.pollmanagement.core.event.VoteWithdrawn;
import de.justvotes.pollmanagement.core.exception.PollNotActiveException;
import de.justvotes.pollmanagement.core.exception.PollNotFoundException;
import de.justvotes.pollmanagement.core.exception.ResultsNotAvailableException;
import de.justvotes.pollmanagement.core.exception.VoteNotFoundException;
import de.justvotes.pollmanagement.core.model.*;
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

    private static VoteManagement management(Poll... polls) {
        return management(Instant.now(), polls);
    }

    private static VoteManagement management(Poll poll, Instant now) {
        return management(now, poll);
    }

    private static VoteManagement management(InMemoryPollRepository polls) {
        return new VoteManagement(polls, pollId -> List.of(), ignored -> {
        }, Instant::now);
    }

    private static VoteManagement management(Instant now, Poll... polls) {
        return new VoteManagement(new InMemoryPollRepository(polls), pollId -> List.of(), ignored -> {
        }, () -> now);
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
    void withdrawsOwnVoteIdempotentlyAndRecordsTheRemovalAtTheClockTime() {
        Poll poll = activePollWithVote(OLD_IDENTITY);
        var polls = new InMemoryPollRepository(poll);
        var events = new ArrayList<PollDomainEvent>();
        Instant withdrawalTime = Instant.parse("2026-08-30T10:05:00Z");
        VoteManagement management = new VoteManagement(polls, pollId -> List.of(), events::add, () -> withdrawalTime);

        management.withdrawVote(poll.id(), OLD_IDENTITY);
        management.withdrawVote(poll.id(), OLD_IDENTITY);

        assertEquals(List.of(), poll.votes());
        assertEquals(List.of(new VoteWithdrawn(poll.id(), new Vote(OLD_IDENTITY, 1, VOTE_TIME), "Ja", withdrawalTime)), events);
        assertEquals(List.of(poll), polls.saved());
    }

    @Test
    void rejectsPrivateAndNonActivePollsWithTheirDocumentedSemantics() {
        Poll privatePoll = Poll.reconstitue(
                Poll.PollId.newId(), "Privat", "systemadmin", Poll.Visibility.PRIVATE, Poll.State.ACTIVE,
                group(), List.of("Ja"), List.of("Ja"), List.of());
        Poll expiredPoll = Poll.reconstitue(
                Poll.PollId.newId(), "Abgelaufen", "systemadmin", Poll.Visibility.PUBLIC, Poll.State.EXPIRED,
                group(), List.of("Ja"), List.of("Ja"), List.of());
        VoteManagement management = management(privatePoll, expiredPoll);

        assertThrows(PollNotFoundException.class, () -> management.withdrawVote(privatePoll.id(), OLD_IDENTITY));
        assertThrows(PollNotActiveException.class, () -> management.withdrawVote(expiredPoll.id(), OLD_IDENTITY));
        assertThrows(PollNotFoundException.class, () -> management.withdrawVote(Poll.PollId.newId(), OLD_IDENTITY));
        Poll activePoll = activePollWithVote(OLD_IDENTITY);
        assertThrows(IllegalArgumentException.class, () -> management(activePoll).withdrawVote(activePoll.id(), null));
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

    @Test
    void removesTheAddressedCurrentVoteWithAnImmutableAdminAuditEvent() {
        Poll poll = Poll.reconstitue(
                Poll.PollId.newId(), "Aktuelle Wahl", "systemadmin", Poll.Visibility.PUBLIC, Poll.State.ACTIVE,
                group(), List.of("Ja", "Nein"), List.of("Ja", "Nein"),
                List.of(new Vote(42L, OLD_IDENTITY, 2, VOTE_TIME)));
        var polls = new InMemoryPollRepository(poll);
        var events = new ArrayList<PollDomainEvent>();
        Instant removalTime = Instant.parse("2026-08-30T10:05:00Z");
        VoteManagement management = new VoteManagement(polls, pollId -> List.of(), events::add, () -> removalTime);

        management.removeAdminVote(42L, "systemadmin", "  Regelverstoß  ");

        assertEquals(List.of(), poll.votes());
        assertEquals(List.of(new VoteRemovedByAdmin(
                poll.id(), new Vote(42L, OLD_IDENTITY, 2, VOTE_TIME), "Nein", "systemadmin", "Regelverstoß", removalTime)), events);
        assertEquals(List.of(poll), polls.saved());
        assertThrows(VoteNotFoundException.class, () -> management.removeAdminVote(42L, "systemadmin", "Regelverstoß"));
    }

    @Test
    void rejectsMissingBlankOrOverlongAdminRemovalReasons() {
        Poll poll = activePollWithVote(OLD_IDENTITY);
        VoteManagement management = management(poll);

        assertThrows(IllegalArgumentException.class, () -> management.removeAdminVote(0L, "systemadmin", "Grund"));
        assertThrows(IllegalArgumentException.class, () -> management.removeAdminVote(1L, "systemadmin", "  "));
        assertThrows(IllegalArgumentException.class, () -> management.removeAdminVote(1L, "systemadmin", "x".repeat(1_001)));
        assertThrows(IllegalArgumentException.class, () -> management.removeAdminVote(1L, " ", "Grund"));
    }

    @Test
    void listsAdministrativeVotesAndEnforcesDocumentedPagingBounds() {
        Poll poll = activePollWithVote(OLD_IDENTITY);
        AdminVote vote = new AdminVote(42L, poll.id(), poll.title(), OLD_IDENTITY, 1, "Ja", VOTE_TIME);
        AdminVotePage expected = new AdminVotePage(List.of(vote), 1, 2, 3);
        InMemoryPollRepository polls = new InMemoryPollRepository(poll);
        polls.adminPage = expected;
        VoteManagement management = management(polls);

        assertEquals(expected, management.adminVotes(1, 2));
        assertThrows(IllegalArgumentException.class, () -> management.adminVotes(-1, 2));
        assertThrows(IllegalArgumentException.class, () -> management.adminVotes(0, 0));
        assertThrows(IllegalArgumentException.class, () -> management.adminVotes(0, 101));
    }

    private static final class InMemoryPollRepository implements PollRepository {
        private final List<Poll> polls;
        private final List<Poll> saved = new ArrayList<>();
        private AdminVotePage adminPage = new AdminVotePage(List.of(), 0, 50, 0);

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
        public List<de.justvotes.pollmanagement.core.model.PollSummary> findAllPublicSummaries() {
            return List.of();
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
        public de.justvotes.pollmanagement.core.model.AdminVotePage findAdminVotes(int page, int size) {
            return adminPage;
        }

        @Override
        public Optional<Poll> findByVoteId(long voteId) {
            return polls.stream().filter(poll -> poll.votes().stream().anyMatch(vote -> vote.id() == voteId)).findFirst();
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
