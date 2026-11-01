package de.justvotes.bootstrap;

import com.fasterxml.jackson.databind.JsonNode;
import de.justvotes.accountmanagement.core.model.EmailAddress;
import de.justvotes.accountmanagement.core.model.InvitationToken;
import de.justvotes.accountmanagement.core.ports.out.InvitationMailer;
import de.justvotes.bootstrap.support.AccountHttpTestBase;
import de.justvotes.bootstrap.support.TestSession;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
class MemberPollExtensionHttpTest extends AccountHttpTestBase {
    private static final Path DATABASE_PATH = Path.of("target", "member-polls-" + UUID.randomUUID() + ".db");
    private static final String FUTURE = "{\"endsAt\":\"2099-01-01T00:00:00Z\"}";

    @Autowired
    TokenRecorder mailer;

    @DynamicPropertySource
    static void applicationProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:sqlite:" + DATABASE_PATH);
        registry.add("ADMIN_EMAIL", () -> "systemadmin@example.test");
        registry.add("ADMIN_PASSWORD_HASH", () -> new BCryptPasswordEncoder().encode("password"));
    }

    private void join(TestSession admin, String identity) {
        String email = identity.toLowerCase(Locale.ROOT) + "@example.test";
        assertThat(admin.post(url("/admin/invitations"), "{\"email\":\"" + email + "\"}").getStatusCode().value()).isEqualTo(201);
        String token = mailer.tokens.getLast();
        ResponseEntity<String> accepted = fixtures().anonymous().post(url("/invitations/acceptance"),
                "{\"token\":\"" + token + "\",\"userID\":\"" + identity + "\",\"password\":\"correct-horse-battery\"}");
        assertThat(accepted.getStatusCode().value()).as(accepted.getBody()).isEqualTo(200);
    }

    private String groupId(TestSession admin, String kind, String name) {
        for (JsonNode group : json(admin.get(url("/admin/template-catalog/groups")))) {
            if (group.path("kind").asText().equals(kind) && group.path("name").asText().equals(name)) {
                return group.path("id").asText();
            }
        }
        throw new AssertionError("Group not found: " + name);
    }

    private String createPoll(TestSession admin, String title, String groupId) {
        ResponseEntity<String> created = admin.post(url("/admin/polls"), "{\"title\":\"" + title + "\",\"templateGroupId\":\"" + groupId + "\"}");
        assertThat(created.getStatusCode().value()).as(created.getBody()).isEqualTo(201);
        return json(created).path("id").asText();
    }

    private List<String> optionTexts(TestSession admin, String pollId) {
        for (JsonNode poll : json(admin.get(url("/admin/polls")))) {
            if (poll.path("id").asText().equals(pollId)) {
                List<String> texts = new ArrayList<>();
                poll.path("options").forEach(option -> texts.add(option.path("number").asInt() + ":" + option.path("text").asText()));
                return texts;
            }
        }
        throw new AssertionError("Poll not found: " + pollId);
    }

    @Test
    void extendsOnlyOpenPollsOfTheMembersGroupAndKeepsTheirVotes() {
        TestSession admin = fixtures().loginAsAdmin();
        String members = groupId(admin, "members", "Alle Mitglieder");
        assertProblem(admin.post(url("/admin/polls"), "{\"title\":\"Leer\",\"templateGroupId\":\"" + members + "\"}"), 400, "invalid-request");

        join(admin, "Anna");
        join(admin, "Bert");
        String manualGroup = json(admin.post(url("/admin/template-catalog/groups"), "{\"name\":\"Vorstand\",\"description\":\"\"}")).path("id").asText();
        String template = json(admin.post(url("/admin/template-catalog/templates"), "{\"name\":\"Ja\"}")).path("id").asText();
        admin.put(url("/admin/template-catalog/groups/" + manualGroup + "/templates/" + template));

        String active = createPoll(admin, "Dienst", members);
        admin.put(url("/admin/polls/" + active + "/publication"), FUTURE);
        String draft = createPoll(admin, "Entwurf", members);
        String edited = createPoll(admin, "Geaendert", members);
        assertThat(admin.put(url("/admin/polls/" + edited + "/options"), "{\"optionTexts\":[\"Anna\",\"Extra\"]}").getStatusCode().value()).isEqualTo(200);
        assertThat(optionTexts(admin, edited)).containsExactly("1:Anna", "2:Extra");
        String archived = createPoll(admin, "Archiv", members);
        admin.put(url("/admin/polls/" + archived + "/publication"), FUTURE);
        admin.put(url("/admin/polls/" + archived + "/archive"));
        String manual = createPoll(admin, "Vorstand", manualGroup);
        admin.put(url("/admin/polls/" + manual + "/publication"), FUTURE);
        TestSession voter = fixtures().loginAsUser("voter");
        assertThat(voter.post(url("/polls/" + active + "/votes"), "{\"optionNumber\":2}").getStatusCode().value()).isEqualTo(200);

        join(admin, "Clara");

        assertThat(optionTexts(admin, active)).containsExactly("1:Anna", "2:Bert", "3:Clara");
        assertThat(optionTexts(admin, draft)).containsExactly("1:Anna", "2:Bert", "3:Clara");
        assertThat(optionTexts(admin, edited)).containsExactly("1:Anna", "2:Extra", "3:Clara");
        assertThat(optionTexts(admin, archived)).containsExactly("1:Anna", "2:Bert");
        assertThat(optionTexts(admin, manual)).containsExactly("1:Ja");
        JsonNode vote = json(voter.get(url("/polls/" + active)));
        assertThat(vote.path("totalVotes").asInt()).isEqualTo(1);
        JsonNode added = null;
        for (JsonNode entry : json(voter.get(url("/polls/" + active + "/audit")))) {
            if (entry.path("event").asText().equals("PollOptionAdded")) {
                added = entry;
            }
        }
        assertThat(added).isNotNull();
        assertThat(added.path("actor").asText()).isEqualTo("System");
        assertThat(added.path("selection").asText()).isEqualTo("Clara");
        assertThat(added.path("optionNumber").asInt()).isEqualTo(3);
        assertThat(added.path("reason").asText()).isEqualTo("member-joined");
    }

    static final class TokenRecorder implements InvitationMailer {
        final List<String> tokens = new ArrayList<>();

        @Override
        public boolean isAvailable() {
            return true;
        }

        @Override
        public void send(EmailAddress recipient, InvitationToken token, Instant expiresAt, Locale locale) {
            tokens.add(token.value());
        }
    }

    @TestConfiguration
    static class MailerConfiguration {
        @Bean
        @Primary
        TokenRecorder tokenRecorder() {
            return new TokenRecorder();
        }
    }
}
