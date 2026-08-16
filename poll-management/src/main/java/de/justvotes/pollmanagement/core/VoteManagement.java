package de.justvotes.pollmanagement.core;

import de.justvotes.pollmanagement.core.event.PollDomainEvent;
import de.justvotes.pollmanagement.core.event.VoteCast;
import de.justvotes.pollmanagement.core.event.VoteRemovedForIdentityChange;
import de.justvotes.pollmanagement.core.event.VoteReplaced;
import de.justvotes.pollmanagement.core.exception.PollNotFoundException;
import de.justvotes.pollmanagement.core.model.*;
import de.justvotes.pollmanagement.core.ports.in.ManageVotes;
import de.justvotes.pollmanagement.core.ports.in.ViewVotes;
import de.justvotes.pollmanagement.core.ports.out.PollAuditRepository;
import de.justvotes.pollmanagement.core.ports.out.PollEventPublisher;
import de.justvotes.pollmanagement.core.ports.out.PollRepository;
import io.vavr.control.Try;

import java.util.List;
import java.util.Objects;
import java.util.Optional;

public final class VoteManagement implements ManageVotes, ViewVotes {
    private final PollRepository polls;
    private final PollAuditRepository audit;
    private final PollEventPublisher events;
    private final de.justvotes.pollmanagement.core.ports.out.UtcClock clock;

    public VoteManagement(PollRepository polls, PollAuditRepository audit, PollEventPublisher events,
                          de.justvotes.pollmanagement.core.ports.out.UtcClock clock) {
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
        VoteOutcome outcome = poll.castOrReplace(identity, optionNumber);
        if (outcome.status() == VoteOutcome.Status.UNCHANGED) {
            return outcome;
        }
        return Try.success(poll)
                .andThen(p -> {
                    String selection = optionText(p, outcome.vote());
                    events.publish( switch (outcome.status()) {
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
    public Optional<Vote> currentVote(Poll.PollId pollId, Identity identity) {
        return polls.findById(pollId).flatMap(poll -> poll.votes().stream().filter(vote -> vote.identity().equals(identity)).findFirst());
    }

    @Override
    public List<AuditEntry> publicAudit(Poll.PollId pollId) {
        publiclyReadable(pollId);
        return audit.findByPollId(pollId);
    }

    private Poll publiclyVotable(Poll.PollId pollId) {
        Poll poll = polls.findById(pollId).orElseThrow(() -> new PollNotFoundException(pollId));
        if (poll.expireIfDue(clock.now())) {
            events.publish(new de.justvotes.pollmanagement.core.event.PollLifecycleChanged(poll.id(), "System", de.justvotes.pollmanagement.core.event.PollLifecycleChanged.Type.PollExpired, null));
            polls.save(poll);
        }
        if (!poll.isPubliclyVisible()) {
            throw new PollNotFoundException(pollId);
        }
        return poll;
    }

    private Poll publiclyReadable(Poll.PollId pollId) {
        Poll poll = polls.findById(pollId).orElseThrow(() -> new PollNotFoundException(pollId));
        if (!poll.isPubliclyReadable()) throw new PollNotFoundException(pollId);
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
