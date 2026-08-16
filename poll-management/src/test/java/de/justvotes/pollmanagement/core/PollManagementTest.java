package de.justvotes.pollmanagement.core;

import de.justvotes.pollmanagement.core.model.Poll;
import de.justvotes.pollmanagement.core.model.PollPublished;
import de.justvotes.pollmanagement.core.model.TemplateGroupSnapshot;
import de.justvotes.pollmanagement.core.ports.out.PollRepository;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PollManagementTest {
    @Test
    void createsAPrivateDraftWithAnAlphabeticallySortedTemplateGroupSnapshot() {
        var polls = new InMemoryPollRepository();
        var management = new PollManagement(polls, groupId -> new TemplateGroupSnapshot(groupId, "Gremium", List.of("Zeta", "Alpha")), event -> {
        });

        Poll poll = management.createDraft("Mitgliederwahl", Poll.TemplateGroupId.of(7), "systemadmin");

        assertEquals(Poll.Visibility.PRIVATE, poll.visibility());
        assertEquals(Poll.State.DRAFT, poll.state());
        assertEquals(7, poll.templateGroup().id().value());
        assertEquals(List.of("Alpha", "Zeta"), poll.options().stream().map(Poll.Option::text).toList());
        assertEquals(List.of("Alpha", "Zeta"), poll.templateSnapshotOptions().stream().map(Poll.Option::text).toList());
    }

    @Test
    void rejectsAnEmptyTemplateGroupAndDuplicateNormalizedDraftOptions() {
        var emptyGroupManagement = new PollManagement(new InMemoryPollRepository(), groupId -> new TemplateGroupSnapshot(groupId, "Leer", List.of()), event -> {
        });

        assertThrows(IllegalArgumentException.class, () -> emptyGroupManagement.createDraft("Mitgliederwahl", Poll.TemplateGroupId.of(7), "systemadmin"));

        var management = new PollManagement(new InMemoryPollRepository(), groupId -> new TemplateGroupSnapshot(groupId, "Gremium", List.of("Ja")), event -> {
        });
        Poll poll = management.createDraft("Mitgliederwahl", Poll.TemplateGroupId.of(7), "systemadmin");
        assertThrows(IllegalArgumentException.class, () -> management.replaceDraftOptions(poll.id(), List.of(" Ja ", "ja")));
        management.replaceDraftOptions(poll.id(), List.of("Nein"));
        assertEquals(List.of("Ja"), poll.templateSnapshotOptions().stream().map(Poll.Option::text).toList());
    }

    @Test
    void publishesADraftAsAnActivePublicPollAndEmitsAPublishedDomainEvent() {
        var publishedEvents = new java.util.ArrayList<PollPublished>();
        var management = new PollManagement(new InMemoryPollRepository(),
                groupId -> new TemplateGroupSnapshot(groupId, "Gremium", List.of("Ja")), publishedEvents::add);
        Poll draft = management.createDraft("Mitgliederwahl", Poll.TemplateGroupId.of(7), "systemadmin");

        Poll published = management.publish(draft.id(), "systemadmin");

        assertEquals(Poll.Visibility.PUBLIC, published.visibility());
        assertEquals(Poll.State.ACTIVE, published.state());
        assertEquals(List.of(new PollPublished(draft.id(), "systemadmin")), publishedEvents);
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
    }
}
