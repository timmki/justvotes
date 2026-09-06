package de.justvotes.bootstrap;

import de.justvotes.pollmanagement.core.model.Poll;
import de.justvotes.pollmanagement.core.model.PollSummary;
import de.justvotes.pollmanagement.core.ports.out.PollRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.PersistenceContext;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
class PollPersistenceIntegrationTest {
    private static final Path DATABASE_PATH = Path.of("target", "poll-persistence-" + UUID.randomUUID() + ".db");

    @Autowired
    PollRepository polls;

    @Autowired
    EntityManagerFactory entityManagerFactory;

    @PersistenceContext
    EntityManager entityManager;

    @DynamicPropertySource
    static void applicationProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:sqlite:" + DATABASE_PATH);
        registry.add("ADMIN_USERNAME", () -> "systemadmin");
        registry.add("ADMIN_PASSWORD_HASH", () -> "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy");
        registry.add("spring.jpa.properties.hibernate.generate_statistics", () -> "true");
    }

    @Test
    @Transactional
    void preservesTheTemplateGroupDescriptionAcrossAPersistenceRoundTrip() {
        Poll poll = Poll.privateDraftFrom(
                new Poll.TemplateGroup(Poll.TemplateGroupId.of(1), "Ursprungsgruppe", "Historischer Gruppenhinweis"),
                "Snapshot-Test", "systemadmin", List.of("Option"));

        polls.save(poll);

        Poll loaded = polls.findById(poll.id()).orElseThrow();

        assertEquals("Ursprungsgruppe", loaded.templateGroup().name());
        assertEquals("Historischer Gruppenhinweis", loaded.templateGroup().description());
    }

    @Test
    @Transactional
    void loadsSeveralPublicPollSummariesWithOneAggregateQuery() {
        Poll first = Poll.privateDraftFrom(
                new Poll.TemplateGroup(Poll.TemplateGroupId.of(1), "Gruppe", ""),
                "Erste Wahl", "systemadmin", List.of("Option"));
        first.publish("systemadmin", Instant.parse("2099-01-01T00:00:00Z"));
        first.castOrReplace(de.justvotes.pollmanagement.core.model.Identity.of("alice"), 1,
                Instant.parse("2026-08-30T10:00:00Z"));
        polls.save(first);

        Poll second = Poll.privateDraftFrom(
                new Poll.TemplateGroup(Poll.TemplateGroupId.of(1), "Gruppe", ""),
                "Zweite Wahl", "systemadmin", List.of("Option"));
        second.publish("systemadmin", Instant.parse("2099-01-01T00:00:00Z"));
        polls.save(second);

        SessionFactory sessionFactory = entityManagerFactory.unwrap(SessionFactory.class);
        entityManager.flush();
        entityManager.clear();
        sessionFactory.getStatistics().clear();

        List<PollSummary> summaries = polls.findAllPublicSummaries();

        assertEquals(List.of(first.id(), second.id()), summaries.stream().map(PollSummary::id).toList());
        assertEquals(List.of(1, 0), summaries.stream().map(PollSummary::totalVotes).toList());
        assertEquals(1, sessionFactory.getStatistics().getPrepareStatementCount());
    }

    @Test
    @Transactional
    void permanentlyDeletesPollsThatContainVotes() {
        Poll poll = Poll.privateDraftFrom(
                new Poll.TemplateGroup(Poll.TemplateGroupId.of(1), "Gruppe", ""),
                "Delete-Test", "systemadmin", List.of("Option"));
        poll.publish("systemadmin", Instant.parse("2099-01-01T00:00:00Z"));
        poll.castOrReplace(de.justvotes.pollmanagement.core.model.Identity.of("alice"), 1,
                Instant.parse("2026-08-30T10:00:00Z"));
        poll.softDelete();

        polls.save(poll);
        entityManager.flush();
        entityManager.clear();
        polls.delete(polls.findById(poll.id()).orElseThrow());
        entityManager.flush();
        entityManager.clear();

        assertEquals(java.util.Optional.empty(), polls.findById(poll.id()));
    }
}
