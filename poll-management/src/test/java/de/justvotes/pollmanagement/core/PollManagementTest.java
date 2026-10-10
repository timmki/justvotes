package de.justvotes.pollmanagement.core;

import de.justvotes.pollmanagement.core.event.PollDomainEvent;
import de.justvotes.pollmanagement.core.event.PollPublished;
import de.justvotes.pollmanagement.core.model.AdminVotePage;
import de.justvotes.pollmanagement.core.model.Poll;
import de.justvotes.pollmanagement.core.model.Poll.Option;
import de.justvotes.pollmanagement.core.model.Poll.PollId;
import de.justvotes.pollmanagement.core.model.Poll.State;
import de.justvotes.pollmanagement.core.model.Poll.TemplateGroupId;
import de.justvotes.pollmanagement.core.model.Poll.Visibility;
import de.justvotes.pollmanagement.core.model.PollSummary;
import de.justvotes.pollmanagement.core.model.TemplateGroupSnapshot;
import de.justvotes.pollmanagement.core.ports.out.PollRepository;
import de.justvotes.pollmanagement.core.ports.out.UtcClock;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PollManagementTest {
    @Test
    void createsAPrivateDraftWithAnAlphabeticallySortedTemplateGroupSnapshot() {
        InMemoryPollRepository polls = new InMemoryPollRepository();
        PollManagement management = new PollManagement(polls, groupId -> new TemplateGroupSnapshot(groupId, "Gremium", "Die gewaehlte Leitung", List.of("Zeta", "Alpha")), event -> {
        }, Instant::now);

        Poll poll = management.createDraft("Mitgliederwahl", TemplateGroupId.of(7), "systemadmin");

        assertEquals(Visibility.PRIVATE, poll.visibility());
        assertEquals(State.DRAFT, poll.state());
        assertEquals(7, poll.templateGroup().id().value());
        assertEquals("Die gewaehlte Leitung", poll.templateGroup().description());
        assertEquals(List.of("Alpha", "Zeta"), poll.options().stream().map(Option::text).toList());
        assertEquals(List.of("Alpha", "Zeta"), poll.templateSnapshotOptions().stream().map(Option::text).toList());
    }

    @Test
    void rejectsAnEmptyTemplateGroupAndDuplicateNormalizedDraftOptions() {
        PollManagement emptyGroupManagement = new PollManagement(new InMemoryPollRepository(), groupId -> new TemplateGroupSnapshot(groupId, "Leer", "", List.of()), event -> {
        }, Instant::now);

        assertThrows(IllegalArgumentException.class, () -> emptyGroupManagement.createDraft("Mitgliederwahl", TemplateGroupId.of(7), "systemadmin"));

        PollManagement management = new PollManagement(new InMemoryPollRepository(), groupId -> new TemplateGroupSnapshot(groupId, "Gremium", "", List.of("Ja")), event -> {
        }, Instant::now);
        Poll poll = management.createDraft("Mitgliederwahl", TemplateGroupId.of(7), "systemadmin");
        assertThrows(IllegalArgumentException.class, () -> management.replaceDraftOptions(poll.id(), List.of(" Ja ", "ja")));
        management.replaceDraftOptions(poll.id(), List.of("Nein"));
        assertEquals(List.of("Ja"), poll.templateSnapshotOptions().stream().map(Option::text).toList());
    }

    @Test
    void publishesADraftAsAnActivePublicPollAndEmitsAPublishedDomainEvent() {
        List<PollDomainEvent> publishedEvents = new ArrayList<>();
        PollManagement management = new PollManagement(new InMemoryPollRepository(),
                groupId -> new TemplateGroupSnapshot(groupId, "Gremium", "", List.of("Ja")), publishedEvents::add, Instant::now);
        Poll draft = management.createDraft("Mitgliederwahl", TemplateGroupId.of(7), "systemadmin");

        Poll published = management.publish(draft.id(), "systemadmin", Instant.parse("2099-01-01T00:00:00Z"));

        assertEquals(Visibility.PUBLIC, published.visibility());
        assertEquals(State.ACTIVE, published.state());
        assertEquals(List.of(new PollPublished(draft.id(), "systemadmin")), publishedEvents);
    }

    @Test
    void expiresDuePollsIdempotentlyAndArchivesThenRestoresThemAsExpired() {
        List<PollDomainEvent> events = new ArrayList<>();
        InMemoryPollRepository repository = new InMemoryPollRepository();
        PollManagement management = new PollManagement(repository, groupId -> new TemplateGroupSnapshot(groupId, "Gremium", "", List.of("Ja")), events::add, Instant::now);
        Poll draft = management.createDraft("Mitgliederwahl", TemplateGroupId.of(7), "systemadmin");
        Instant expiry = Instant.parse("2026-08-16T10:00:00Z");
        management.publish(draft.id(), "systemadmin", expiry);

        assertEquals(1, management.expireDuePolls(expiry));
        assertEquals(0, management.expireDuePolls(expiry));
        assertEquals(State.EXPIRED, draft.state());
        assertEquals(State.ARCHIVED, management.archive(draft.id(), "systemadmin").state());
        assertEquals(State.EXPIRED, management.restoreFromArchive(draft.id(), "systemadmin").state());
        assertEquals("PollExpired", events.get(1).eventType());
    }

    @Test
    void expiresDuePollWhenItsPublicDetailIsRead() {
        List<PollDomainEvent> events = new ArrayList<>();
        InMemoryPollRepository repository = new InMemoryPollRepository();
        Instant expiry = Instant.parse("2026-08-16T10:00:00Z");
        UtcClock clock = () -> expiry;
        PollManagement management = new PollManagement(repository, groupId -> new TemplateGroupSnapshot(groupId, "Gremium", "", List.of("Ja")), events::add, clock);
        Poll draft = management.createDraft("Mitgliederwahl", TemplateGroupId.of(7), "systemadmin");
        management.publish(draft.id(), "systemadmin", expiry);

        Poll publicPoll = management.publicPoll(draft.id());

        assertEquals(State.EXPIRED, publicPoll.state());
        assertEquals(State.EXPIRED, repository.findById(draft.id()).orElseThrow().state());
        assertEquals("PollExpired", events.get(1).eventType());
    }

    @Test
    void expiresDuePollWhenThePublicListIsRead() {
        List<PollDomainEvent> events = new ArrayList<>();
        InMemoryPollRepository repository = new InMemoryPollRepository();
        Instant expiry = Instant.parse("2026-08-16T10:00:00Z");
        PollManagement management = new PollManagement(repository, groupId -> new TemplateGroupSnapshot(groupId, "Gremium", "", List.of("Ja")), events::add, () -> expiry);
        Poll draft = management.createDraft("Mitgliederwahl", TemplateGroupId.of(7), "systemadmin");
        management.publish(draft.id(), "systemadmin", expiry);

        List<PollSummary> summaries = management.publicPolls();

        assertEquals(State.EXPIRED, summaries.get(0).state());
    }

    private static final class InMemoryPollRepository implements PollRepository {
        private Poll poll;

        @Override
        public Poll save(Poll poll) {
            this.poll = poll;
            return poll;
        }

        @Override
        public Optional<Poll> findById(PollId id) {
            return Optional.ofNullable(poll).filter(candidate -> candidate.id().equals(id));
        }

        @Override
        public List<Poll> findAllByCreator(String creator) {
            if (poll == null || !poll.createdBy().equals(creator)) {
                return List.of();
            }
            return List.of(poll);
        }

        @Override
        public List<Poll> findAllByVisibility(Visibility visibility) {
            if (poll == null || poll.visibility() != visibility) {
                return List.of();
            }
            return List.of(poll);
        }

        @Override
        public List<PollSummary> findAllPublicSummaries() {
            if (poll == null || poll.visibility() != Visibility.PUBLIC) {
                return List.of();
            }
            return List.of(new PollSummary(
                    poll.id(), poll.title(), poll.visibility(), poll.state(), poll.createdAt(), poll.endsAt(), poll.templateGroup(),
                    poll.templateSnapshotOptions(), poll.options(), poll.votes().size()));
        }

        @Override
        public List<Poll> findAllPublicActive() {
            if (poll != null && poll.isPubliclyVisible()) {
                return List.of(poll);
            }
            return List.of();
        }

        @Override
        public List<Poll> findAllActive() {
            if (poll != null && poll.state() == State.ACTIVE) {
                return List.of(poll);
            }
            return List.of();
        }

        @Override
        public AdminVotePage findAdminVotes(int page, int size) {
            return new AdminVotePage(List.of(), page, size, 0);
        }

        @Override
        public Optional<Poll> findByVoteId(long voteId) {
            if (poll == null) {
                return Optional.empty();
            }
            if (poll.votes().stream().anyMatch(vote -> vote.id() == voteId)) {
                return Optional.of(poll);
            }
            return Optional.empty();
        }

        @Override
        public void delete(Poll poll) {
            if (this.poll == poll) this.poll = null;
        }
    }
}
