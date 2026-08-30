package de.justvotes.pollmanagement.core.model;

import de.justvotes.pollmanagement.core.exception.PollNotActiveException;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PollTest {
    private static final Identity ALICE = Identity.of("alice");
    private static final Identity BOB = Identity.of("bob");
    private static final Instant VOTE_TIME = Instant.parse("2026-08-30T10:00:00Z");

    @Test
    void withdrawsOnlyTheRequestedIdentityVote() {
        Poll poll = poll(Poll.State.ACTIVE, List.of(
                new Vote(ALICE, 1, VOTE_TIME),
                new Vote(BOB, 2, VOTE_TIME)));

        assertEquals(new Vote(ALICE, 1, VOTE_TIME), poll.removeVoteForIdentity(ALICE).orElseThrow());
        assertEquals(List.of(new Vote(BOB, 2, VOTE_TIME)), poll.votes());
    }

    @Test
    void rejectsWithdrawalOutsideAnActivePoll() {
        Poll poll = poll(Poll.State.EXPIRED, List.of(new Vote(ALICE, 1, VOTE_TIME)));

        assertThrows(PollNotActiveException.class, () -> poll.removeVoteForIdentity(ALICE));
        assertEquals(List.of(new Vote(ALICE, 1, VOTE_TIME)), poll.votes());
    }

    private static Poll poll(Poll.State state, List<Vote> votes) {
        return Poll.reconstitue(
                Poll.PollId.newId(), "Wahl", "systemadmin", Poll.Visibility.PUBLIC, state,
                Instant.parse("2026-08-30T09:00:00Z"), Instant.parse("2099-01-01T00:00:00Z"),
                new Poll.TemplateGroup(Poll.TemplateGroupId.of(1), "Gruppe", ""),
                List.of("Ja", "Nein"), List.of("Ja", "Nein"), votes);
    }
}
