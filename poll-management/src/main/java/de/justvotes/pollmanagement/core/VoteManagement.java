package de.justvotes.pollmanagement.core;

import de.justvotes.pollmanagement.core.event.VoteCast;
import de.justvotes.pollmanagement.core.event.PollLifecycleChanged;
import de.justvotes.pollmanagement.core.event.VoteRemovedForIdentityChange;
import de.justvotes.pollmanagement.core.event.VoteReplaced;
import de.justvotes.pollmanagement.core.event.VoteWithdrawn;
import de.justvotes.pollmanagement.core.exception.PollNotFoundException;
import de.justvotes.pollmanagement.core.exception.PollNotActiveException;
import de.justvotes.pollmanagement.core.exception.ResultsNotAvailableException;
import de.justvotes.pollmanagement.core.model.*;
import de.justvotes.pollmanagement.core.ports.in.ManageVotes;
import de.justvotes.pollmanagement.core.ports.in.ViewVotes;
import de.justvotes.pollmanagement.core.ports.out.PollAuditRepository;
import de.justvotes.pollmanagement.core.ports.out.PollEventPublisher;
import de.justvotes.pollmanagement.core.ports.out.PollRepository;
import de.justvotes.pollmanagement.core.ports.out.UtcClock;
import io.vavr.control.Try;

import java.util.List;
import java.util.Optional;

public final class VoteManagement implements ManageVotes, ViewVotes {
    private final PollRepository polls;
    private final PollAuditRepository audit;
    private final PollEventPublisher events;
    private final UtcClock clock;

    public VoteManagement(PollRepository polls, PollAuditRepository audit, PollEventPublisher events,
                           UtcClock clock) {
        this.polls = polls;
        this.audit = audit;
        this.events = events;
        this.clock = clock;
    }

    @Override
    public void changeIdentity(Identity oldIdentity, Identity newIdentity) {
        if (oldIdentity == null || oldIdentity.equals(newIdentity)) {
            return;
        }
        polls.findAllPublicActive()
                .stream()
                .forEach(poll -> poll.removeVoteForIdentity(oldIdentity)
                        .ifPresent(vote -> {
                            events.publish(new VoteRemovedForIdentityChange(
                                    poll.id(),
                                    vote,
                                    optionText(poll, vote))
                            );
                            polls.save(poll);
                        }));
    }

    @Override
    public VoteOutcome castOrReplace(Poll.PollId pollId, Identity identity, int optionNumber) {
        Poll poll = publiclyVotable(pollId);
        VoteOutcome outcome = poll.castOrReplace(identity, optionNumber, clock.now());
        if (outcome.status() == VoteOutcome.Status.UNCHANGED) {
            return outcome;
        }
        return Try.success(poll)
                .andThen(p -> {
                    String selection = optionText(p, outcome.vote());
                    events.publish(switch (outcome.status()) {
                        case CREATED -> new VoteCast(p.id(), outcome.vote(), selection);
                        case REPLACED -> new VoteReplaced(p.id(), outcome.vote(), selection);
                        default -> null;
                    });
                })
                .map(polls::save)
                .map(ignored -> outcome)
                .get();
    }

    @Override
    public void withdrawVote(Poll.PollId pollId, Identity identity) {
        Poll poll = loadAndExpireIfDue(pollId);
        if (poll.visibility() != Poll.Visibility.PUBLIC) {
            throw new PollNotFoundException(pollId);
        }
        if (poll.state() != Poll.State.ACTIVE) {
            throw new PollNotActiveException(poll.state());
        }
        if (identity == null) {
            throw new IllegalArgumentException("An identity must be set before withdrawing a vote.");
        }

        Optional<Vote> withdrawn = poll.removeVoteForIdentity(identity);
        if (withdrawn.isEmpty()) {
            return;
        }
        events.publish(new VoteWithdrawn(poll.id(), withdrawn.get(), optionText(poll, withdrawn.get()), clock.now()));
        polls.save(poll);
    }

    @Override
    public Optional<Vote> currentVote(Poll.PollId pollId, Identity identity) {
        return polls.findById(pollId).flatMap(poll -> poll.votes().stream().filter(vote -> vote.identity().equals(identity)).findFirst());
    }

    @Override
    public PollResults results(Poll.PollId pollId, Identity identity) {
        Poll poll = publiclyReadableResults(pollId);
        if (poll.state() == Poll.State.ACTIVE && (identity == null || poll.votes().stream().noneMatch(vote -> vote.identity().equals(identity)))) {
            throw new ResultsNotAvailableException();
        }
        return PollResults.from(poll);
    }

    @Override
    public List<AuditEntry> publicAudit(Poll.PollId pollId) {
        publiclyReadable(pollId);
        return audit.findByPollId(pollId);
    }

    private Poll publiclyVotable(Poll.PollId pollId) {
        Poll poll = loadAndExpireIfDue(pollId);
        if (!poll.isPubliclyVisible()) {
            throw new PollNotFoundException(pollId);
        }
        return poll;
    }

    private Poll publiclyReadable(Poll.PollId pollId) {
        Poll poll = polls.findById(pollId).orElseThrow(() -> new PollNotFoundException(pollId));
        if (!poll.isPubliclyReadable()) {
            throw new PollNotFoundException(pollId);
        }
        return poll;
    }

    private Poll publiclyReadableResults(Poll.PollId pollId) {
        Poll poll = loadAndExpireIfDue(pollId);
        if (!poll.isPubliclyReadable()) {
            throw new PollNotFoundException(pollId);
        }
        return poll;
    }

    private Poll loadAndExpireIfDue(Poll.PollId pollId) {
        Poll poll = polls.findById(pollId).orElseThrow(() -> new PollNotFoundException(pollId));
        if (poll.expireIfDue(clock.now())) {
            events.publish(new PollLifecycleChanged(poll.id(), "System", PollLifecycleChanged.Type.PollExpired, null));
            polls.save(poll);
        }
        return poll;
    }

    private String optionText(Poll poll, Vote vote) {
        return poll.options().stream()
                .filter(option -> option.number() == vote.optionNumber())
                .findFirst()
                .map(Poll.Option::text)
                .orElse(null);
    }
}
