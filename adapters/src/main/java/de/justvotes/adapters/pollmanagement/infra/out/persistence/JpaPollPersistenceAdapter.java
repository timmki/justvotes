package de.justvotes.adapters.pollmanagement.infra.out.persistence;

import de.justvotes.pollmanagement.core.model.*;
import de.justvotes.pollmanagement.core.model.Poll.Option;
import de.justvotes.pollmanagement.core.model.Poll.PollId;
import de.justvotes.pollmanagement.core.model.Poll.State;
import de.justvotes.pollmanagement.core.model.Poll.TemplateGroup;
import de.justvotes.pollmanagement.core.model.Poll.TemplateGroupId;
import de.justvotes.pollmanagement.core.model.Poll.Visibility;
import de.justvotes.pollmanagement.core.ports.out.PollRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.time.Instant;
import java.util.*;

public final class JpaPollPersistenceAdapter implements PollRepository {
    private final SpringDataPollRepository polls;
    private final SpringDataPollDomainEventRepository events;
    private final SpringDataVoteRepository votes;

    public JpaPollPersistenceAdapter(SpringDataPollRepository polls, SpringDataPollDomainEventRepository events,
                                     SpringDataVoteRepository votes) {
        this.polls = polls;
        this.events = events;
        this.votes = votes;
    }

    @Override
    public Poll save(Poll poll) {
        PollEntity entity = polls.findById(poll.id().value())
                .orElseGet(() -> {
                    String endsAt = null;
                    if (poll.endsAt() != null) {
                        endsAt = poll.endsAt().toString();
                    }
                    return new PollEntity(
                            poll.id().value(),
                            poll.title(),
                            poll.createdBy(),
                            poll.visibility().name().toLowerCase(),
                            poll.state().name().toLowerCase(),
                            poll.createdAt().toString(),
                            endsAt,
                            poll.templateGroup().id().value(),
                            poll.templateGroup().name(),
                            poll.templateGroup().description());
                });

        entity.updateLifecycle(poll.visibility().name().toLowerCase(), poll.state().name().toLowerCase(), poll.endsAt());

        if (entity.templateSnapshotOptions().isEmpty()) {
            entity.addTemplateSnapshotOptions(poll.templateSnapshotOptions().stream().map(Option::text).toList());
        }

        if (entity.options().isEmpty()) {
            entity.addOptions(poll.options().stream().map(Option::text).toList());
        }

        entity.synchronizeVotes(poll.votes());
        polls.save(entity);
        return poll;
    }

    @Override
    public Optional<Poll> findById(PollId id) {
        return polls.findById(id.value()).map(this::poll);
    }

    @Override
    public List<Poll> findAllByCreator(String creator) {
        return polls.findAllByCreatedByOrderByCreatedAtAsc(creator).stream().map(this::poll).toList();
    }

    @Override
    public List<Poll> findAllByVisibility(Visibility visibility) {
        return polls.findAllByVisibility(visibility.name().toLowerCase()).stream().map(this::poll).toList();
    }

    @Override
    public List<PollSummary> findAllPublicSummaries() {
        Map<String, PollSummaryAccumulator> summaries = new LinkedHashMap<>();
        for (PollSummaryProjection row : polls.findAllPublicSummaries()) {
            summaries.computeIfAbsent(row.getId(), ignored -> new PollSummaryAccumulator(row))
                    .add(row);
        }
        return summaries.values().stream().map(PollSummaryAccumulator::toSummary).toList();
    }

    @Override
    public List<Poll> findAllPublicActive() {
        return polls.findAllByVisibilityAndState(
                Visibility.PUBLIC.name().toLowerCase(),
                State.ACTIVE.name().toLowerCase()
        ).stream().map(this::poll).toList();
    }

    @Override
    public List<Poll> findAllActive() {
        return polls.findAllByState(State.ACTIVE.name().toLowerCase()).stream().map(this::poll).toList();
    }

    @Override
    public AdminVotePage findAdminVotes(int page, int size) {
        Page<AdminVoteProjection> result = votes.findAllForAdministration(PageRequest.of(page, size));
        List<AdminVote> entries = result.getContent().stream().map(row -> new AdminVote(
                row.getVoteId(),
                PollId.of(row.getPollId()),
                row.getPollTitle(),
                Identity.of(row.getUserId()),
                row.getOptionNumber(),
                row.getOptionText(),
                PollEntity.parseInstant(row.getVotedAt()))).toList();
        return new AdminVotePage(entries, page, size, result.getTotalElements());
    }

    @Override
    public Optional<Poll> findByVoteId(long voteId) {
        if (voteId > Integer.MAX_VALUE) {
            return Optional.empty();
        }
        return polls.findByVotesId(Math.toIntExact(voteId)).map(this::poll);
    }

    @Override
    public void delete(Poll poll) {
        events.deleteAllByPollId(poll.id().value());
        votes.deleteAllByPoll_Id(poll.id().value());
        polls.deleteById(poll.id().value());
    }

    private Poll poll(PollEntity entity) {
        return Poll.reconstitue(
                PollId.of(entity.id()),
                entity.title(),
                entity.createdBy(),
                Visibility.valueOf(entity.visibility().toUpperCase()),
                State.valueOf(entity.state().toUpperCase()),
                entity.createdAt(),
                entity.endsAt(),
                TemplateGroup.of(TemplateGroupId.of(entity.templateGroupId()), entity.templateGroupName(), entity.templateGroupDescription()),
                entity.templateSnapshotOptions().stream()
                        .sorted(Comparator.comparingInt(PollTemplateSnapshotOptionEntity::number))
                        .map(PollTemplateSnapshotOptionEntity::text)
                        .toList(),
                entity.options().stream()
                        .sorted(Comparator.comparingInt(PollOptionEntity::number))
                        .map(PollOptionEntity::text)
                        .toList(),
                entity.votes().stream().map(vote -> new Vote(
                        vote.id(), Identity.of(vote.userId()), vote.option().number(), vote.votedAt())).toList());
    }

    private static final class PollSummaryAccumulator {
        private final PollId id;
        private final String title;
        private final Visibility visibility;
        private final State state;
        private final Instant createdAt;
        private final Instant endsAt;
        private final TemplateGroup templateGroup;
        private final Map<Integer, Option> templateSnapshotOptions = new TreeMap<>();
        private final Map<Integer, Option> options = new TreeMap<>();
        private int totalVotes;

        private PollSummaryAccumulator(PollSummaryProjection row) {
            id = PollId.of(row.getId());
            title = row.getTitle();
            visibility = Visibility.valueOf(row.getVisibility().toUpperCase());
            createdAt = PollEntity.parseInstant(row.getCreatedAt());
            if (row.getEndsAt() == null) {
                endsAt = null;
            } else {
                endsAt = PollEntity.parseInstant(row.getEndsAt());
            }
            state = State.valueOf(row.getState().toUpperCase());
            templateGroup = TemplateGroup.of(
                    TemplateGroupId.of(row.getTemplateGroupId()),
                    row.getTemplateGroupName(),
                    row.getTemplateGroupDescription());
            totalVotes = Math.toIntExact(row.getTotalVotes());
        }

        private void add(PollSummaryProjection row) {
            if (row.getOptionNumber() != null) {
                options.put(row.getOptionNumber(), new Option(row.getOptionNumber(), row.getOptionText()));
            }
            if (row.getTemplateSnapshotOptionNumber() != null) {
                templateSnapshotOptions.put(row.getTemplateSnapshotOptionNumber(), new Option(
                        row.getTemplateSnapshotOptionNumber(), row.getTemplateSnapshotOptionText()));
            }
        }

        private PollSummary toSummary() {
            return new PollSummary(id, title, visibility, state, createdAt, endsAt, templateGroup,
                    templateSnapshotOptions.values().stream().toList(), options.values().stream().toList(), totalVotes);
        }
    }
}
