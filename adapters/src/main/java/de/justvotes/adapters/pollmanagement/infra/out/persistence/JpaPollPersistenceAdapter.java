package de.justvotes.adapters.pollmanagement.infra.out.persistence;

import de.justvotes.pollmanagement.core.model.Poll;
import de.justvotes.pollmanagement.core.ports.out.PollRepository;

import java.util.List;
import java.util.Optional;

public final class JpaPollPersistenceAdapter implements PollRepository {
    private final SpringDataPollRepository polls;

    public JpaPollPersistenceAdapter(SpringDataPollRepository polls) {
        this.polls = polls;
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
                        poll.templateGroup().id().value(),
                        poll.templateGroup().name()));

        entity.updateVisibilityAndState(poll.visibility().name().toLowerCase(), poll.state().name().toLowerCase());

        if (entity.templateSnapshotOptions().isEmpty()) {
            entity.addTemplateSnapshotOptions(poll.templateSnapshotOptions().stream().map(Poll.Option::text).toList());
        }

        entity.clearOptions();
        polls.flush();
        entity.addOptions(poll.options().stream().map(Poll.Option::text).toList());
        polls.save(entity);
        return poll;
    }

    @Override
    public Optional<Poll> findById(Poll.PollId id) {
        return polls.findById(id.value()).map(this::poll);
    }

    @Override
    public List<Poll> findAllByCreator(String creator) {
        return polls.findAllByCreatedBy(creator).stream().map(this::poll).toList();
    }

    @Override
    public List<Poll> findAllByVisibility(Poll.Visibility visibility) {
        return polls.findAllByVisibility(visibility.name().toLowerCase()).stream().map(this::poll).toList();
    }

    private Poll poll(PollEntity entity) {
        return Poll.reconstitue(
                Poll.PollId.of(entity.id()),
                entity.title(),
                entity.createdBy(),
                Poll.Visibility.valueOf(entity.visibility().toUpperCase()),
                Poll.State.valueOf(entity.state().toUpperCase()),
                Poll.TemplateGroup.of(Poll.TemplateGroupId.of(entity.templateGroupId()), entity.templateGroupName()),
                entity.templateSnapshotOptions().stream()
                        .sorted(java.util.Comparator.comparingInt(PollTemplateSnapshotOptionEntity::number))
                        .map(PollTemplateSnapshotOptionEntity::text)
                        .toList(),
                entity.options().stream()
                        .sorted(java.util.Comparator.comparingInt(PollOptionEntity::number))
                        .map(PollOptionEntity::text)
                        .toList());
    }
}
