package de.justvotes.adapters.pollmanagement.infra.out.persistence;

import de.justvotes.pollmanagement.core.model.Poll;
import de.justvotes.pollmanagement.core.model.Identity;
import de.justvotes.pollmanagement.core.model.Vote;
import de.justvotes.pollmanagement.core.ports.out.PollRepository;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

public final class JpaPollPersistenceAdapter implements PollRepository {
    private final SpringDataPollRepository polls;
    private final SpringDataPollDomainEventRepository events;

    public JpaPollPersistenceAdapter(SpringDataPollRepository polls, SpringDataPollDomainEventRepository events) {
        this.polls = polls;
        this.events = events;
    }

    @Override
    public Poll save(Poll poll) {
        PollEntity entity = polls.findById(poll.id().value())
                .orElseGet(() -> new PollEntity(
                        poll.id().value(),
                        poll.title(),
                        poll.createdBy(),
                        poll.visibility().name().toLowerCase(),
                        poll.state().name().toLowerCase(),
                        poll.endsAt() == null ? null : poll.endsAt().toString(),
                        poll.templateGroup().id().value(),
                        poll.templateGroup().name(),
                        poll.templateGroup().description()));

        entity.updateLifecycle(poll.visibility().name().toLowerCase(), poll.state().name().toLowerCase(), poll.endsAt());

        if (entity.templateSnapshotOptions().isEmpty()) {
            entity.addTemplateSnapshotOptions(poll.templateSnapshotOptions().stream().map(Poll.Option::text).toList());
        }

        if (entity.options().isEmpty()) {
            entity.addOptions(poll.options().stream().map(Poll.Option::text).toList());
        }

        entity.synchronizeVotes(poll.votes());
        polls.save(entity);
        return poll;
    }

    @Override
    public Optional<Poll> findById(Poll.PollId id) {
        return polls.findById(id.value()).map(this::poll);
    }

    @Override
    public List<Poll> findAllByCreator(String creator) {
        return polls.findAllByCreatedByOrderByCreatedAtAsc(creator).stream().map(this::poll).toList();
    }

    @Override
    public List<Poll> findAllByVisibility(Poll.Visibility visibility) {
        return polls.findAllByVisibility(visibility.name().toLowerCase()).stream().map(this::poll).toList();
    }

    @Override
    public List<Poll> findAllPublicActive() {
        return polls.findAllByVisibilityAndState(
                Poll.Visibility.PUBLIC.name().toLowerCase(),
                Poll.State.ACTIVE.name().toLowerCase()
        ).stream().map(this::poll).toList();
    }

    @Override
    public List<Poll> findAllActive() {
        return polls.findAllByState(Poll.State.ACTIVE.name().toLowerCase()).stream().map(this::poll).toList();
    }

    @Override
    public void delete(Poll poll) {
        events.deleteAllByPollId(poll.id().value());
        polls.deleteById(poll.id().value());
    }

    private Poll poll(PollEntity entity) {
        return Poll.reconstitue(
                Poll.PollId.of(entity.id()),
                entity.title(),
                entity.createdBy(),
                Poll.Visibility.valueOf(entity.visibility().toUpperCase()),
                Poll.State.valueOf(entity.state().toUpperCase()),
                entity.endsAt(),
                Poll.TemplateGroup.of(Poll.TemplateGroupId.of(entity.templateGroupId()), entity.templateGroupName(), entity.templateGroupDescription()),
                entity.templateSnapshotOptions().stream()
                        .sorted(Comparator.comparingInt(PollTemplateSnapshotOptionEntity::number))
                        .map(PollTemplateSnapshotOptionEntity::text)
                        .toList(),
                entity.options().stream()
                        .sorted(Comparator.comparingInt(PollOptionEntity::number))
                        .map(PollOptionEntity::text)
                        .toList(),
                entity.votes().stream().map(vote -> new Vote(
                        Identity.of(vote.userId()), vote.option().number())).toList());
    }
}
