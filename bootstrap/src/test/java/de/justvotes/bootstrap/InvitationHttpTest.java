package de.justvotes.bootstrap;

import com.fasterxml.jackson.databind.JsonNode;
import de.justvotes.accountmanagement.core.model.EmailAddress;
import de.justvotes.accountmanagement.core.model.InvitationToken;
import de.justvotes.accountmanagement.core.ports.out.InvitationMailer;
import de.justvotes.bootstrap.support.AccountFixtures;
import de.justvotes.bootstrap.support.AccountHttpTestBase;
import de.justvotes.bootstrap.support.TestSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.context.SpringBootTest;
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
class InvitationHttpTest extends AccountHttpTestBase {
    private static final Path DATABASE_PATH = Path.of("target", "invitations-" + UUID.randomUUID() + ".db");

    @Autowired
    RecordingMailer mailer;

    @DynamicPropertySource
    static void applicationProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:sqlite:" + DATABASE_PATH);
        registry.add("ADMIN_EMAIL", () -> "systemadmin@example.test");
        registry.add("ADMIN_PASSWORD_HASH", () -> new BCryptPasswordEncoder().encode("password"));
    }

    @BeforeEach
    void resetMailer() {
        mailer.available = true;
        mailer.failing = false;
    }

    private String inviteAndReceiveToken(TestSession admin, String email) {
        int before = mailer.sent.size();
        ResponseEntity<String> created = admin.post(url("/admin/invitations"), "{\"email\":\"" + email + "\",\"locale\":\"en\"}");
        assertThat(created.getStatusCode().value()).as(created.getBody()).isEqualTo(201);
        assertThat(mailer.sent).hasSize(before + 1);
        Sent sent = mailer.sent.getLast();
        assertThat(sent.recipient()).isEqualTo(email);
        assertThat(sent.locale()).isEqualTo(Locale.ENGLISH);
        return sent.token();
    }

    private static String acceptance(String token, String identity, String password) {
        return "{\"token\":\"" + token + "\",\"userID\":\"" + identity
                + "\",\"password\":\"" + password + "\"}";
    }

    @Test
    void invitedPersonCompletesTheAccountAndIsSignedIn() {
        TestSession admin = fixtures().loginAsAdmin();
        String token = inviteAndReceiveToken(admin, "anna@example.test");

        TestSession visitor = fixtures().anonymous();
        ResponseEntity<String> preview = visitor.post(url("/invitations/inspection"), "{\"token\":\"" + token + "\"}");
        assertThat(preview.getStatusCode().value()).isEqualTo(200);
        assertThat(json(preview).path("email").asText()).isEqualTo("anna@example.test");
        assertThat(json(preview).path("expiresAt").asText()).endsWith("Z");

        ResponseEntity<String> accepted = visitor.post(url("/invitations/acceptance"),
                acceptance(token, "Anna", "correct-horse-battery"));
        assertThat(accepted.getStatusCode().value()).as(accepted.getBody()).isEqualTo(200);
        JsonNode session = json(accepted);
        assertThat(session.path("role").asText()).isEqualTo("user");
        assertThat(session.path("identity").asText()).isEqualTo("Anna");
        TestSession anna = new TestSession(visitor.client(),
                visitor.cookies() + "; " + AccountFixtures.cookieHeader(accepted.getHeaders()), visitor.csrfToken());
        assertThat(anna.get(url("/session")).getStatusCode().value()).isEqualTo(200);
        assertThat(anna.get(url("/polls")).getStatusCode().value()).isEqualTo(200);

        assertProblem(fixtures().anonymous().post(url("/invitations/acceptance"),
                acceptance(token, "Anna2", "correct-horse-battery")), 409, "invitation-not-usable");
        assertProblem(fixtures().anonymous().post(url("/invitations/inspection"), "{\"token\":\"" + token + "\"}"),
                409, "invitation-not-usable");
        assertThat(fixtures().login("ANNA@example.test", "correct-horse-battery").get(url("/session")).getStatusCode().value()).isEqualTo(200);

        JsonNode invitations = json(admin.get(url("/admin/invitations")));
        assertThat(invitations.get(0).path("status").asText()).isEqualTo("accepted");
    }

    @Test
    void rejectsDuplicateInvitationsTakenIdentitiesAndWeakPasswords() {
        TestSession admin = fixtures().loginAsAdmin();
        fixtures().user("Taken Identity", "taken@example.test", "correct-horse-battery");
        assertProblem(admin.post(url("/admin/invitations"), "{\"email\":\"TAKEN@example.test\"}"), 409, "email-already-invited");
        String token = inviteAndReceiveToken(admin, "bert@example.test");
        assertProblem(admin.post(url("/admin/invitations"), "{\"email\":\"bert@example.test\"}"), 409, "email-already-invited");

        TestSession visitor = fixtures().anonymous();
        assertProblem(visitor.post(url("/invitations/acceptance"), acceptance(token, "taken identity", "correct-horse-battery")),
                409, "identity-taken");
        assertProblem(visitor.post(url("/invitations/acceptance"), acceptance(token, "Bert", "short")),
                422, "password-policy-violation");
        ResponseEntity<String> padded = visitor.post(url("/invitations/acceptance"), acceptance(token, " Bert", "correct-horse-battery"));
        assertProblem(padded, 400, "invalid-account-input");
        assertThat(json(padded).path("field").asText()).isEqualTo("userID");
        assertThat(json(padded).path("rule").asText()).isEqualTo("whitespace");
        assertThat(visitor.post(url("/invitations/inspection"), "{\"token\":\"" + token + "\"}").getStatusCode().value()).isEqualTo(200);
    }

    @Test
    void resendInvalidatesTheOldLinkAndRevokeEndsTheInvitation() {
        TestSession admin = fixtures().loginAsAdmin();
        String first = inviteAndReceiveToken(admin, "carla@example.test");
        String id = null;
        for (JsonNode invitation : json(admin.get(url("/admin/invitations")))) {
            if (invitation.path("email").asText().equals("carla@example.test")) {
                id = invitation.path("invitationId").asText();
            }
        }
        ResponseEntity<String> resent = admin.post(url("/admin/invitations/" + id + "/resend"));
        assertThat(resent.getStatusCode().value()).as(resent.getBody()).isEqualTo(200);
        String second = mailer.sent.getLast().token();
        assertThat(second).isNotEqualTo(first);

        TestSession visitor = fixtures().anonymous();
        assertProblem(visitor.post(url("/invitations/inspection"), "{\"token\":\"" + first + "\"}"), 409, "invitation-not-usable");
        assertThat(visitor.post(url("/invitations/inspection"), "{\"token\":\"" + second + "\"}").getStatusCode().value()).isEqualTo(200);

        assertThat(admin.delete(url("/admin/invitations/" + id)).getStatusCode().value()).isEqualTo(204);
        assertProblem(visitor.post(url("/invitations/inspection"), "{\"token\":\"" + second + "\"}"), 409, "invitation-not-usable");
        assertProblem(admin.delete(url("/admin/invitations/" + id)), 409, "invitation-not-usable");
    }

    @Test
    void recordsDeliveryFailuresAndRejectsInvitationsWithoutMailDelivery() {
        TestSession admin = fixtures().loginAsAdmin();
        mailer.failing = true;
        ResponseEntity<String> created = admin.post(url("/admin/invitations"), "{\"email\":\"dora@example.test\"}");
        assertThat(created.getStatusCode().value()).isEqualTo(201);
        assertThat(json(created).path("deliveryFailed").asBoolean()).isTrue();
        assertThat(json(created).path("status").asText()).isEqualTo("open");

        mailer.available = false;
        assertProblem(admin.post(url("/admin/invitations"), "{\"email\":\"erik@example.test\"}"), 409, "invitation-delivery-unavailable");
    }

    @Test
    void rejectsAcceptanceWhileSignedIn() {
        TestSession admin = fixtures().loginAsAdmin();
        String token = inviteAndReceiveToken(admin, "fritz@example.test");
        TestSession user = fixtures().loginAsUser("Already Signed In");
        assertProblem(user.post(url("/invitations/acceptance"), acceptance(token, "Fritz", "correct-horse-battery")),
                409, "already-authenticated");
    }

    @Test
    void invitationAdministrationIsForTheAdministratorOnly() {
        TestSession user = fixtures().loginAsUser("Not An Admin");
        assertProblem(user.get(url("/admin/invitations")), 403, "access-denied");
        assertProblem(user.post(url("/admin/invitations"), "{\"email\":\"x@example.test\"}"), 403, "access-denied");
    }

    record Sent(String recipient, String token, Locale locale) {
    }

    static final class RecordingMailer implements InvitationMailer {
        final List<Sent> sent = new ArrayList<>();
        volatile boolean available = true;
        volatile boolean failing;

        @Override
        public boolean isAvailable() {
            return available;
        }

        @Override
        public void send(EmailAddress recipient, InvitationToken token, Instant expiresAt, Locale locale) {
            if (failing) {
                throw new IllegalStateException("SMTP down");
            }
            sent.add(new Sent(recipient.value(), token.value(), locale));
        }
    }

    @TestConfiguration
    static class MailerConfiguration {
        @Bean
        @Primary
        RecordingMailer recordingMailer() {
            return new RecordingMailer();
        }
    }
}
