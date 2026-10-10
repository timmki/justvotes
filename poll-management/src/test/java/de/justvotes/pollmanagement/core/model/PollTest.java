package de.justvotes.pollmanagement.core.model;

import de.justvotes.pollmanagement.core.exception.PollNotActiveException;
import de.justvotes.pollmanagement.core.model.Poll.PollId;
import de.justvotes.pollmanagement.core.model.Poll.State;
import de.justvotes.pollmanagement.core.model.Poll.TemplateGroup;
import de.justvotes.pollmanagement.core.model.Poll.TemplateGroupId;
import de.justvotes.pollmanagement.core.model.Poll.Visibility;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class PollTest {
    private static final Identity ALICE = Identity.of("alice");
    private static final Identity BOB = Identity.of("bob");
    private static final Instant VOTE_TIME = Instant.parse("2026-08-30T10:00:00Z");

    private static Poll poll(State state, List<Vote> votes) {
        return Poll.reconstitue(
                PollId.newId(), "Wahl", "systemadmin", Visibility.PUBLIC, state,
                Instant.parse("2026-08-30T09:00:00Z"), Instant.parse("2099-01-01T00:00:00Z"),
                new TemplateGroup(TemplateGroupId.of(1), "Gruppe", ""),
                List.of("Ja", "Nein"), List.of("Ja", "Nein"), votes);
    }

    @Test
    void withdrawsOnlyTheRequestedIdentityVote() {
        Poll poll = poll(State.ACTIVE, List.of(
                new Vote(ALICE, 1, VOTE_TIME),
                new Vote(BOB, 2, VOTE_TIME)));

        assertEquals(new Vote(ALICE, 1, VOTE_TIME), poll.removeVoteForIdentity(ALICE).orElseThrow());
        assertEquals(List.of(new Vote(BOB, 2, VOTE_TIME)), poll.votes());
    }

    @Test
    void rejectsWithdrawalOutsideAnActivePoll() {
        Poll poll = poll(State.EXPIRED, List.of(new Vote(ALICE, 1, VOTE_TIME)));

        assertThrows(PollNotActiveException.class, () -> poll.removeVoteForIdentity(ALICE));
        assertEquals(List.of(new Vote(ALICE, 1, VOTE_TIME)), poll.votes());
    }

    @Test
    void removesOnlyTheVoteWithTheRequestedTechnicalId() {
        Vote alice = new Vote(41L, ALICE, 1, VOTE_TIME);
        Vote bob = new Vote(42L, BOB, 2, VOTE_TIME);
        Poll poll = poll(State.EXPIRED, List.of(alice, bob));

        assertEquals(alice, poll.removeVoteById(41L).orElseThrow());
        assertEquals(List.of(bob), poll.votes());
        assertTrue(poll.removeVoteById(41L).isEmpty());
    }
}
