package de.justvotes.pollmanagement.core;

import de.justvotes.pollmanagement.core.exception.PollNotFoundException;
import de.justvotes.pollmanagement.core.model.Poll;
import de.justvotes.pollmanagement.core.event.PollPublished;
import de.justvotes.pollmanagement.core.event.PollLifecycleChanged;
import de.justvotes.pollmanagement.core.ports.in.ManagePolls;
import de.justvotes.pollmanagement.core.ports.in.ViewPolls;
import de.justvotes.pollmanagement.core.ports.out.PollEventPublisher;
import de.justvotes.pollmanagement.core.ports.out.PollRepository;
import de.justvotes.pollmanagement.core.ports.out.TemplateGroupSnapshotProvider;
import io.vavr.control.Try;

import java.util.List;
import java.time.Instant;

public final class PollManagement implements ManagePolls, ViewPolls {
    private final PollRepository polls;
    private final TemplateGroupSnapshotProvider templateGroups;
    private final PollEventPublisher events;

    public PollManagement(PollRepository polls, TemplateGroupSnapshotProvider templateGroups, PollEventPublisher events) {
        this.polls = polls;
        this.templateGroups = templateGroups;
        this.events = events;
    }

    @Override
    public Poll createDraft(String title, Poll.TemplateGroupId templateGroupId, String systemAdmin) {
        return Try.of(() -> templateGroups.snapshotOf(templateGroupId))
                .map(snapshot -> Poll.privateDraftFrom(new Poll.TemplateGroup(snapshot.id(), snapshot.name()), title, systemAdmin, snapshot.optionTexts()))
                .map(polls::save)
                .get();
    }

    @Override
    public Poll replaceDraftOptions(Poll.PollId pollId, List<String> optionTexts) {
        return Try.success(pollId)
                .map(this::poll)
                .map(poll -> poll.replaceOptions(optionTexts))
                .map(polls::save)
                .get();
    }

    @Override
    public Poll publish(Poll.PollId pollId, String systemAdmin, Instant endsAt) {
        return Try.success(pollId).map(this::poll).map(poll -> {
            events.publish(poll.publish(systemAdmin, endsAt));
            return poll;
        }).map(polls::save).get();
    }

    @Override
    public Poll makePrivate(Poll.PollId pollId) {
        return polls.save(poll(pollId).makePrivate());
    }

    @Override
    public int expireDuePolls(Instant now) {
        return (int) polls.findAllActive().stream().filter(poll -> poll.expireIfDue(now))
                .peek(poll -> events.publish(new PollLifecycleChanged(poll.id(), "System", PollLifecycleChanged.Type.PollExpired, null)))
                .peek(polls::save).count();
    }

    @Override public Poll archive(Poll.PollId id, String actor) { return transition(id, actor, PollLifecycleChanged.Type.PollArchived, Poll::archive); }
    @Override public Poll restoreFromArchive(Poll.PollId id, String actor) { return transition(id, actor, PollLifecycleChanged.Type.PollRestoredFromArchive, Poll::restoreFromArchive); }
    @Override public Poll softDelete(Poll.PollId id, String actor) { return transition(id, actor, PollLifecycleChanged.Type.PollSoftDeleted, Poll::softDelete); }
    @Override public Poll restore(Poll.PollId id, String actor) { return transition(id, actor, PollLifecycleChanged.Type.PollRestored, Poll::restore); }

    @Override
    public Poll changeExpiry(Poll.PollId pollId, Instant endsAt, String actor) {
        Poll poll = poll(pollId);
        Instant previousEndsAt = poll.endsAt();
        poll.changeExpiry(endsAt);
        events.publish(new PollLifecycleChanged(poll.id(), actor, PollLifecycleChanged.Type.PollExpiryChanged, previousEndsAt + " -> " + endsAt));
        return polls.save(poll);
    }

    @Override public Poll reopen(Poll.PollId id, Instant now, String actor) { return transition(id, actor, PollLifecycleChanged.Type.PollReopened, poll -> poll.reopen(now)); }

    @Override
    public void permanentlyDelete(Poll.PollId pollId, boolean confirmed, boolean confirmationRepeated) {
        if (!confirmed || !confirmationRepeated) throw new IllegalArgumentException("Permanent deletion requires two confirmations.");
        Poll poll = poll(pollId);
        poll.requireDeleted();
        polls.delete(poll);
    }

    @Override
    public List<Poll> draftsCreatedBy(String systemAdmin) {
        return polls.findAllByCreator(systemAdmin).stream().filter(poll -> poll.state() == Poll.State.DRAFT).toList();
    }

    @Override
    public List<Poll> publicPolls() {
        return polls.findAllByVisibility(Poll.Visibility.PUBLIC).stream().filter(poll -> poll.state() == Poll.State.ACTIVE || poll.state() == Poll.State.EXPIRED).toList();
    }

    @Override
    public Poll publicPoll(Poll.PollId pollId) {
        Poll poll = poll(pollId);
        if (!poll.isPubliclyReadable()) throw new PollNotFoundException(pollId);
        return poll;
    }

    @Override public List<Poll> pollsCreatedBy(String systemAdmin) { return polls.findAllByCreator(systemAdmin); }

    private Poll transition(Poll.PollId id, String actor, PollLifecycleChanged.Type eventType, java.util.function.Function<Poll, Poll> action) {
        Poll poll = action.apply(poll(id));
        events.publish(new PollLifecycleChanged(poll.id(), actor, eventType, null));
        return polls.save(poll);
    }

    private Poll poll(Poll.PollId id) {
        return polls.findById(id).orElseThrow(() -> new PollNotFoundException(id));
    }
}
