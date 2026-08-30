package de.justvotes.bootstrap;

import de.justvotes.pollmanagement.core.model.Poll;
import de.justvotes.pollmanagement.core.ports.out.PollRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Path;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
class PollPersistenceIntegrationTest {
    private static final Path DATABASE_PATH = Path.of("target", "poll-persistence-" + UUID.randomUUID() + ".db");

    @Autowired
    PollRepository polls;

    @DynamicPropertySource
    static void applicationProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:sqlite:" + DATABASE_PATH);
        registry.add("ADMIN_USERNAME", () -> "systemadmin");
        registry.add("ADMIN_PASSWORD_HASH", () -> "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy");
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
}
