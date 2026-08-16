package de.justvotes.pollmanagement.core;

import de.justvotes.pollmanagement.core.exception.PollNotFoundException;
import de.justvotes.pollmanagement.core.model.Poll;
import de.justvotes.pollmanagement.core.event.PollPublished;
import de.justvotes.pollmanagement.core.ports.in.ManagePolls;
import de.justvotes.pollmanagement.core.ports.in.ViewPolls;
import de.justvotes.pollmanagement.core.ports.out.PollEventPublisher;
import de.justvotes.pollmanagement.core.ports.out.PollRepository;
import de.justvotes.pollmanagement.core.ports.out.TemplateGroupSnapshotProvider;
import io.vavr.control.Try;

import java.util.List;

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
    public Poll publish(Poll.PollId pollId, String systemAdmin) {
        return Try.success(pollId)
                .map(this::poll)
                .map(poll -> {
                    PollPublished pubPoll = poll.publish(systemAdmin);
                    events.publish(pubPoll);
                    return poll;
                })
                .map(polls::save)
                .get();
    }

    @Override
    public Poll makePrivate(Poll.PollId pollId) {
        return polls.save(poll(pollId).makePrivate());
    }

    @Override
    public List<Poll> draftsCreatedBy(String systemAdmin) {
        return polls.findAllByCreator(systemAdmin).stream().filter(poll -> poll.state() == Poll.State.DRAFT).toList();
    }

    @Override
    public List<Poll> publicPolls() {
        return polls.findAllByVisibility(Poll.Visibility.PUBLIC).stream().filter(Poll::isPubliclyVisible).toList();
    }

    @Override
    public Poll publicPoll(Poll.PollId pollId) {
        Poll poll = poll(pollId);
        if (!poll.isPubliclyVisible()) throw new PollNotFoundException(pollId);
        return poll;
    }

    private Poll poll(Poll.PollId id) {
        return polls.findById(id).orElseThrow(() -> new PollNotFoundException(id));
    }
}
