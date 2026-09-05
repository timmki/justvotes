package de.justvotes.pollmanagement.core;

import de.justvotes.pollmanagement.core.event.*;
import de.justvotes.pollmanagement.core.exception.PollNotActiveException;
import de.justvotes.pollmanagement.core.exception.PollNotFoundException;
import de.justvotes.pollmanagement.core.exception.ResultsNotAvailableException;
import de.justvotes.pollmanagement.core.exception.VoteNotFoundException;
import de.justvotes.pollmanagement.core.model.*;
import de.justvotes.pollmanagement.core.ports.in.ManageAdminVotes;
import de.justvotes.pollmanagement.core.ports.in.ManageVotes;
import de.justvotes.pollmanagement.core.ports.in.ViewAdminVotes;
import de.justvotes.pollmanagement.core.ports.in.ViewVotes;
import de.justvotes.pollmanagement.core.ports.out.PollAuditRepository;
import de.justvotes.pollmanagement.core.ports.out.PollEventPublisher;
import de.justvotes.pollmanagement.core.ports.out.PollRepository;
import de.justvotes.pollmanagement.core.ports.out.UtcClock;
import io.vavr.control.Try;

import java.util.List;
import java.util.Optional;

public final class VoteManagement implements ManageVotes, ViewVotes, ManageAdminVotes, ViewAdminVotes {
    private static final int MAX_REASON_LENGTH = 1_000;
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

    private static String requiredText(String value, String message) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException(message);
        }
        return value.trim();
    }

    @Override
    public void changeIdentity(Identity oldIdentity, Identity newIdentity) {
        if (oldIdentity == null || oldIdentity.equals(newIdentity)) {
            return;
        }
        polls.findAllPublicActive()
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
    public void removeAdminVote(long voteId, String adminId, String reason) {
        if (voteId <= 0) {
            throw new IllegalArgumentException("A persisted vote ID must be positive.");
        }
        String normalizedAdminId = requiredText(adminId, "An administrator ID must not be blank.");
        String normalizedReason = requiredText(reason, "A vote removal reason must not be blank.");
        if (normalizedReason.length() > MAX_REASON_LENGTH) {
            throw new IllegalArgumentException("A vote removal reason is too long.");
        }

        Poll poll = polls.findByVoteId(voteId).orElseThrow(() -> new VoteNotFoundException(voteId));
        Vote removed = poll.removeVoteById(voteId).orElseThrow(() -> new VoteNotFoundException(voteId));
        events.publish(new VoteRemovedByAdmin(poll.id(), removed, optionText(poll, removed), normalizedAdminId, normalizedReason, clock.now()));
        polls.save(poll);
    }

    @Override
    public AdminVotePage adminVotes(int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new IllegalArgumentException("Invalid administrative vote paging.");
        }
        return polls.findAdminVotes(page, size);
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

    private void publiclyReadable(Poll.PollId pollId) {
        Poll poll = loadAndExpireIfDue(pollId);
        if (!poll.isPubliclyReadable()) {
            throw new PollNotFoundException(pollId);
        }
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
