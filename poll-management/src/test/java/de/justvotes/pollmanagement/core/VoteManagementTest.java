package de.justvotes.pollmanagement.core;

import de.justvotes.pollmanagement.core.event.PollDomainEvent;
import de.justvotes.pollmanagement.core.event.PollLifecycleChanged;
import de.justvotes.pollmanagement.core.event.VoteRemovedByAdmin;
import de.justvotes.pollmanagement.core.event.VoteRemovedForIdentityChange;
import de.justvotes.pollmanagement.core.event.VoteWithdrawn;
import de.justvotes.pollmanagement.core.exception.PollNotActiveException;
import de.justvotes.pollmanagement.core.exception.PollNotFoundException;
import de.justvotes.pollmanagement.core.exception.ResultsNotAvailableException;
import de.justvotes.pollmanagement.core.exception.VoteNotFoundException;
import de.justvotes.pollmanagement.core.model.*;
import de.justvotes.pollmanagement.core.model.AdminVotePage;
import de.justvotes.pollmanagement.core.model.Poll.PollId;
import de.justvotes.pollmanagement.core.model.Poll.State;
import de.justvotes.pollmanagement.core.model.Poll.TemplateGroup;
import de.justvotes.pollmanagement.core.model.Poll.TemplateGroupId;
import de.justvotes.pollmanagement.core.model.Poll.Visibility;
import de.justvotes.pollmanagement.core.model.PollResults.OptionResult;
import de.justvotes.pollmanagement.core.model.PollSummary;
import de.justvotes.pollmanagement.core.ports.out.PollRepository;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class VoteManagementTest {
    private static final Identity OLD_IDENTITY = Identity.of("alice");
    private static final Identity NEW_IDENTITY = Identity.of("bob");
    private static final Instant VOTE_TIME = Instant.parse("2026-08-01T10:01:00Z");

    private static Poll activePollWithVote(Identity identity) {
        Poll poll = Poll.reconstitue(
                PollId.newId(), "Aktuelle Wahl", "systemadmin", Visibility.PUBLIC, State.ACTIVE,
                group(), List.of("Ja"), List.of("Ja"), List.of()
        );
        poll.castOrReplace(identity, 1, VOTE_TIME);
        return poll;
    }

    private static TemplateGroup group() {
        return TemplateGroup.of(TemplateGroupId.of(1), "Wahl", "");
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
                PollId.newId(), "Vergangene Wahl", "systemadmin", Visibility.PUBLIC, State.EXPIRED,
                group(), List.of("Ja"), List.of("Ja"), List.of(new Vote(OLD_IDENTITY, 1, VOTE_TIME))
        );
        InMemoryPollRepository polls = new InMemoryPollRepository(firstOpenPoll, secondOpenPoll, closedPoll);
        List<PollDomainEvent> events = new ArrayList<>();
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
        InMemoryPollRepository polls = new InMemoryPollRepository(openPoll);
        List<PollDomainEvent> events = new ArrayList<>();
        VoteManagement management = new VoteManagement(polls, pollId -> List.of(), events::add, Instant::now);

        management.changeIdentity(OLD_IDENTITY, OLD_IDENTITY);

        assertEquals(List.of(new Vote(OLD_IDENTITY, 1, VOTE_TIME)), openPoll.votes());
        assertEquals(List.of(), events);
        assertEquals(List.of(), polls.saved());
    }

    @Test
    void withdrawsOwnVoteIdempotentlyAndRecordsTheRemovalAtTheClockTime() {
        Poll poll = activePollWithVote(OLD_IDENTITY);
        InMemoryPollRepository polls = new InMemoryPollRepository(poll);
        List<PollDomainEvent> events = new ArrayList<>();
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
                PollId.newId(), "Privat", "systemadmin", Visibility.PRIVATE, State.ACTIVE,
                group(), List.of("Ja"), List.of("Ja"), List.of());
        Poll expiredPoll = Poll.reconstitue(
                PollId.newId(), "Abgelaufen", "systemadmin", Visibility.PUBLIC, State.EXPIRED,
                group(), List.of("Ja"), List.of("Ja"), List.of());
        VoteManagement management = management(privatePoll, expiredPoll);

        assertThrows(PollNotFoundException.class, () -> management.withdrawVote(privatePoll.id(), OLD_IDENTITY));
        assertThrows(PollNotActiveException.class, () -> management.withdrawVote(expiredPoll.id(), OLD_IDENTITY));
        assertThrows(PollNotFoundException.class, () -> management.withdrawVote(PollId.newId(), OLD_IDENTITY));
        Poll activePoll = activePollWithVote(OLD_IDENTITY);
        assertThrows(IllegalArgumentException.class, () -> management(activePoll).withdrawVote(activePoll.id(), null));
    }

    @Test
    void returnsCurrentVotesWithStableOptionAndVoterOrdering() {
        Instant createdAt = Instant.parse("2026-08-01T10:00:00Z");
        Instant aliceVotedAt = Instant.parse("2026-08-01T10:02:00Z");
        Instant zuluVotedAt = Instant.parse("2026-08-01T10:01:00Z");
        Poll poll = Poll.reconstitue(
                PollId.newId(), "Aktuelle Wahl", "systemadmin", Visibility.PUBLIC, State.ACTIVE,
                createdAt, Instant.parse("2099-01-01T00:00:00Z"), group(), List.of("Ja", "Nein"), List.of("Ja", "Nein"),
                List.of(new Vote(Identity.of("zulu"), 1, zuluVotedAt), new Vote(Identity.of("alice"), 2, aliceVotedAt))
        );
        VoteManagement management = management(poll, Instant.parse("2026-08-01T10:03:00Z"));

        PollResults results = management.results(poll.id(), Identity.of("alice"));

        assertEquals(createdAt, results.createdAt());
        assertEquals(2, results.totalVotes());
        assertEquals(List.of(1, 2), results.options().stream().map(OptionResult::number).toList());
        assertEquals(List.of(1, 1), results.options().stream().map(OptionResult::voteCount).toList());
        assertEquals(List.of("alice"), results.options().get(1).votes().stream().map(vote -> vote.identity().value()).toList());
        assertEquals(aliceVotedAt, results.options().get(1).votes().get(0).votedAt());
        assertEquals(List.of("zulu"), results.options().get(0).votes().stream().map(vote -> vote.identity().value()).toList());
    }

    @Test
    void onlyAllowsActivePollResultsToTheVoterAndAllowsExpiredResultsWithoutAnIdentity() {
        Poll active = Poll.reconstitue(
                PollId.newId(), "Aktive Wahl", "systemadmin", Visibility.PUBLIC, State.ACTIVE,
                Instant.parse("2026-08-01T10:00:00Z"), Instant.parse("2099-01-01T00:00:00Z"), group(), List.of("Ja"), List.of("Ja"),
                List.of(new Vote(OLD_IDENTITY, 1, Instant.parse("2026-08-01T10:01:00Z")))
        );
        Poll expired = Poll.reconstitue(
                PollId.newId(), "Vergangene Wahl", "systemadmin", Visibility.PUBLIC, State.EXPIRED,
                Instant.parse("2026-08-01T10:00:00Z"), Instant.parse("2026-08-01T09:00:00Z"), group(), List.of("Ja"), List.of("Ja"), List.of()
        );
        VoteManagement management = management(active, expired);

        assertThrows(ResultsNotAvailableException.class, () -> management.results(active.id(), null));
        assertThrows(ResultsNotAvailableException.class, () -> management.results(active.id(), NEW_IDENTITY));
        assertEquals(expired.id(), management.results(expired.id(), null).id());
    }

    @Test
    void expiresDuePollBeforeReleasingItsResults() {
        Instant expiry = Instant.parse("2026-08-16T10:00:00Z");
        Poll due = Poll.reconstitue(
                PollId.newId(), "Faellige Wahl", "systemadmin", Visibility.PUBLIC, State.ACTIVE,
                Instant.parse("2026-08-01T10:00:00Z"), expiry, group(), List.of("Ja"), List.of("Ja"), List.of()
        );
        InMemoryPollRepository polls = new InMemoryPollRepository(due);
        VoteManagement management = new VoteManagement(polls, pollId -> List.of(), ignored -> {
        }, () -> expiry);

        PollResults results = management.results(due.id(), null);

        assertEquals(due.id(), results.id());
        assertEquals(State.EXPIRED, due.state());
        assertEquals(List.of(due), polls.saved());
    }

    @Test
    void removesTheAddressedCurrentVoteWithAnImmutableAdminAuditEvent() {
        Poll poll = Poll.reconstitue(
                PollId.newId(), "Aktuelle Wahl", "systemadmin", Visibility.PUBLIC, State.ACTIVE,
                group(), List.of("Ja", "Nein"), List.of("Ja", "Nein"),
                List.of(new Vote(42L, OLD_IDENTITY, 2, VOTE_TIME)));
        InMemoryPollRepository polls = new InMemoryPollRepository(poll);
        List<PollDomainEvent> events = new ArrayList<>();
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

    @Test
    void personalVotesIsolateExactIdentityAndOnlyIncludeReadableResolvedVotesInStableOrder() {
        List<Poll> eligible = new ArrayList<>();
        for (State state : State.values()) {
            for (Visibility visibility : Visibility.values()) {
                eligible.add(Poll.reconstitue(PollId.newId(), state.name(), "admin", visibility, state,
                        group(), List.of("Ja"), List.of("Ja"), List.of(new Vote(OLD_IDENTITY, 1, VOTE_TIME))));
            }
        }
        Poll other = activePollWithVote(Identity.of("Alice"));
        Poll unresolved = Poll.reconstitue(PollId.newId(), "Unresolved", "admin", Visibility.PUBLIC,
                State.EXPIRED, group(), List.of("Ja"), List.of("Ja"), List.of(new Vote(OLD_IDENTITY, 99, VOTE_TIME)));
        eligible.add(other);
        eligible.add(unresolved);
        VoteManagement service = management(VOTE_TIME, eligible.toArray(Poll[]::new));
        List<PersonalVote> actual = service.currentVotes(OLD_IDENTITY);
        assertEquals(3, actual.size());
        assertEquals(List.of(State.ACTIVE, State.EXPIRED, State.ARCHIVED).stream().sorted().toList(),
                actual.stream().map(PersonalVote::pollState).sorted().toList());
        assertEquals(actual.stream().map(v -> v.pollId().value()).sorted().toList(),
                actual.stream().map(v -> v.pollId().value()).toList());
        assertEquals(1, service.currentVotes(Identity.of("Alice")).size());
        assertEquals(List.of(), service.currentVotes(Identity.of(" alice")));
        assertEquals(List.of(), service.currentVotes(null));
        actual.forEach(v -> { assertEquals("Ja", v.optionText()); assertEquals(VOTE_TIME, v.votedAt()); });
    }

    @Test
    void personalVotesExpireOnReadAndPersistExactlyOneLifecycleEvent() {
        Poll due = Poll.reconstitue(PollId.newId(), "Due", "admin", Visibility.PUBLIC, State.ACTIVE,
                VOTE_TIME.minusSeconds(60), VOTE_TIME, group(), List.of("Ja"), List.of("Ja"),
                List.of(new Vote(OLD_IDENTITY, 1, VOTE_TIME.minusSeconds(30))));
        InMemoryPollRepository repository = new InMemoryPollRepository(due);
        List<PollDomainEvent> events = new ArrayList<>();
        VoteManagement service = new VoteManagement(repository, id -> List.of(), events::add, () -> VOTE_TIME);
        assertEquals(State.EXPIRED, service.currentVotes(OLD_IDENTITY).getFirst().pollState());
        service.currentVotes(OLD_IDENTITY);
        assertEquals(List.of(due), repository.saved());
        assertEquals(1, events.size());
        assertEquals("PollExpired", ((PollLifecycleChanged) events.getFirst()).type().name());
    }

    @Test
    void personalVotesTrackCastReplacementWithdrawalAndIdentityChangesWithNewestFirst() {
        Poll first = Poll.reconstitue(PollId.newId(), "First", "admin", Visibility.PUBLIC, State.ACTIVE,
                group(), List.of("Ja", "Nein"), List.of("Ja", "Nein"), List.of());
        Poll second = activePollWithVote(OLD_IDENTITY);
        AtomicReference<Instant> now = new AtomicReference<>(VOTE_TIME.plusSeconds(60));
        VoteManagement service = new VoteManagement(new InMemoryPollRepository(first, second), id -> List.of(), event -> {}, now::get);
        service.castOrReplace(first.id(), OLD_IDENTITY, 1);
        assertEquals(List.of(first.id(), second.id()), service.currentVotes(OLD_IDENTITY).stream().map(PersonalVote::pollId).toList());
        now.set(VOTE_TIME.plusSeconds(120));
        service.castOrReplace(first.id(), OLD_IDENTITY, 2);
        assertEquals(2, service.currentVotes(OLD_IDENTITY).getFirst().optionNumber());
        assertEquals(now.get(), service.currentVotes(OLD_IDENTITY).getFirst().votedAt());
        service.withdrawVote(first.id(), OLD_IDENTITY);
        assertEquals(List.of(second.id()), service.currentVotes(OLD_IDENTITY).stream().map(PersonalVote::pollId).toList());
        service.castOrReplace(first.id(), NEW_IDENTITY, 1);
        service.changeIdentity(OLD_IDENTITY, NEW_IDENTITY);
        assertEquals(List.of(), service.currentVotes(OLD_IDENTITY));
        assertEquals(List.of(first.id()), service.currentVotes(NEW_IDENTITY).stream().map(PersonalVote::pollId).toList());
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
        public Optional<Poll> findById(PollId id) {
            return polls.stream().filter(poll -> poll.id().equals(id)).findFirst();
        }

        @Override
        public List<Poll> findAllByCreator(String creator) {
            return polls.stream().filter(poll -> poll.createdBy().equals(creator)).toList();
        }

        @Override
        public List<Poll> findAllByVisibility(Visibility visibility) {
            return polls.stream().filter(poll -> poll.visibility() == visibility).toList();
        }

        @Override
        public List<PollSummary> findAllPublicSummaries() {
            return List.of();
        }

        @Override
        public List<Poll> findAllPublicActive() {
            return polls.stream().filter(Poll::isPubliclyVisible).toList();
        }

        @Override
        public List<Poll> findAllActive() {
            return polls.stream().filter(poll -> poll.state() == State.ACTIVE).toList();
        }

        @Override
        public AdminVotePage findAdminVotes(int page, int size) {
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
