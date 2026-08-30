package de.justvotes.pollmanagement.core;

import de.justvotes.pollmanagement.core.event.PollDomainEvent;
import de.justvotes.pollmanagement.core.event.PollPublished;
import de.justvotes.pollmanagement.core.model.Poll;
import de.justvotes.pollmanagement.core.model.TemplateGroupSnapshot;
import de.justvotes.pollmanagement.core.ports.out.PollRepository;
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
        var polls = new InMemoryPollRepository();
        var management = new PollManagement(polls, groupId -> new TemplateGroupSnapshot(groupId, "Gremium", "Die gewaehlte Leitung", List.of("Zeta", "Alpha")), event -> {
        });

        Poll poll = management.createDraft("Mitgliederwahl", Poll.TemplateGroupId.of(7), "systemadmin");

        assertEquals(Poll.Visibility.PRIVATE, poll.visibility());
        assertEquals(Poll.State.DRAFT, poll.state());
        assertEquals(7, poll.templateGroup().id().value());
        assertEquals("Die gewaehlte Leitung", poll.templateGroup().description());
        assertEquals(List.of("Alpha", "Zeta"), poll.options().stream().map(Poll.Option::text).toList());
        assertEquals(List.of("Alpha", "Zeta"), poll.templateSnapshotOptions().stream().map(Poll.Option::text).toList());
    }

    @Test
    void rejectsAnEmptyTemplateGroupAndDuplicateNormalizedDraftOptions() {
        var emptyGroupManagement = new PollManagement(new InMemoryPollRepository(), groupId -> new TemplateGroupSnapshot(groupId, "Leer", "", List.of()), event -> {
        });

        assertThrows(IllegalArgumentException.class, () -> emptyGroupManagement.createDraft("Mitgliederwahl", Poll.TemplateGroupId.of(7), "systemadmin"));

        var management = new PollManagement(new InMemoryPollRepository(), groupId -> new TemplateGroupSnapshot(groupId, "Gremium", "", List.of("Ja")), event -> {
        });
        Poll poll = management.createDraft("Mitgliederwahl", Poll.TemplateGroupId.of(7), "systemadmin");
        assertThrows(IllegalArgumentException.class, () -> management.replaceDraftOptions(poll.id(), List.of(" Ja ", "ja")));
        management.replaceDraftOptions(poll.id(), List.of("Nein"));
        assertEquals(List.of("Ja"), poll.templateSnapshotOptions().stream().map(Poll.Option::text).toList());
    }

    @Test
    void publishesADraftAsAnActivePublicPollAndEmitsAPublishedDomainEvent() {
        var publishedEvents = new ArrayList<PollDomainEvent>();
        var management = new PollManagement(new InMemoryPollRepository(),
                groupId -> new TemplateGroupSnapshot(groupId, "Gremium", "", List.of("Ja")), publishedEvents::add);
        Poll draft = management.createDraft("Mitgliederwahl", Poll.TemplateGroupId.of(7), "systemadmin");

        Poll published = management.publish(draft.id(), "systemadmin", Instant.parse("2099-01-01T00:00:00Z"));

        assertEquals(Poll.Visibility.PUBLIC, published.visibility());
        assertEquals(Poll.State.ACTIVE, published.state());
        assertEquals(List.of(new PollPublished(draft.id(), "systemadmin")), publishedEvents);
    }

    @Test
    void expiresDuePollsIdempotentlyAndArchivesThenRestoresThemAsExpired() {
        var events = new ArrayList<PollDomainEvent>();
        var repository = new InMemoryPollRepository();
        var management = new PollManagement(repository, groupId -> new TemplateGroupSnapshot(groupId, "Gremium", "", List.of("Ja")), events::add);
        Poll draft = management.createDraft("Mitgliederwahl", Poll.TemplateGroupId.of(7), "systemadmin");
        Instant expiry = Instant.parse("2026-08-16T10:00:00Z");
        management.publish(draft.id(), "systemadmin", expiry);

        assertEquals(1, management.expireDuePolls(expiry));
        assertEquals(0, management.expireDuePolls(expiry));
        assertEquals(Poll.State.EXPIRED, draft.state());
        assertEquals(Poll.State.ARCHIVED, management.archive(draft.id(), "systemadmin").state());
        assertEquals(Poll.State.EXPIRED, management.restoreFromArchive(draft.id(), "systemadmin").state());
        assertEquals("PollExpired", events.get(1).eventType());
    }

    private static final class InMemoryPollRepository implements PollRepository {
        private Poll poll;

        @Override
        public Poll save(Poll poll) {
            this.poll = poll;
            return poll;
        }

        @Override
        public Optional<Poll> findById(Poll.PollId id) {
            return Optional.ofNullable(poll).filter(candidate -> candidate.id().equals(id));
        }

        @Override
        public List<Poll> findAllByCreator(String creator) {
            return poll == null || !poll.createdBy().equals(creator) ? List.of() : List.of(poll);
        }

        @Override
        public List<Poll> findAllByVisibility(Poll.Visibility visibility) {
            return poll == null || poll.visibility() != visibility ? List.of() : List.of(poll);
        }

        @Override
        public List<de.justvotes.pollmanagement.core.model.PollSummary> findAllPublicSummaries() {
            return List.of();
        }

        @Override
        public List<Poll> findAllPublicActive() {
            return poll != null && poll.isPubliclyVisible() ? List.of(poll) : List.of();
        }

        @Override
        public List<Poll> findAllActive() {
            return poll != null && poll.state() == Poll.State.ACTIVE ? List.of(poll) : List.of();
        }

        @Override
        public de.justvotes.pollmanagement.core.model.AdminVotePage findAdminVotes(int page, int size) {
            return new de.justvotes.pollmanagement.core.model.AdminVotePage(List.of(), page, size, 0);
        }

        @Override
        public Optional<Poll> findByVoteId(long voteId) {
            return poll == null ? Optional.empty() : poll.votes().stream()
                    .anyMatch(vote -> vote.id() == voteId) ? Optional.of(poll) : Optional.empty();
        }

        @Override
        public void delete(Poll poll) {
            if (this.poll == poll) this.poll = null;
        }
    }
}
