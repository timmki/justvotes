package de.justvotes.bootstrap;

import com.fasterxml.jackson.databind.JsonNode;
import de.justvotes.bootstrap.InvitationHttpTest.RecordingMailer;
import de.justvotes.bootstrap.support.AccountHttpTestBase;
import de.justvotes.bootstrap.support.TestSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
class ContactImportHttpTest extends AccountHttpTestBase {
    private static final Path DATABASE_PATH = Path.of("target", "contact-import-" + UUID.randomUUID() + ".db");
    private static final String PREVIEW = "/admin/invitations/contact-import/preview";
    private static final String IMPORT = "/admin/invitations/contact-import";

    @Autowired
    RecordingMailer mailer;
    @Autowired
    JdbcTemplate jdbc;

    @DynamicPropertySource
    static void applicationProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:sqlite:" + DATABASE_PATH);
        registry.add("ADMIN_EMAIL", () -> "systemadmin@example.test");
        registry.add("ADMIN_PASSWORD_HASH", () -> new BCryptPasswordEncoder().encode("password"));
    }

    private static String card(String name, String email) {
        return "BEGIN:VCARD\r\nVERSION:3.0\r\nFN:" + name + "\r\nEMAIL;TYPE=HOME:" + email
                + "\r\nTEL;TYPE=CELL:0000\r\nEND:VCARD\r\n";
    }

    private static String fixture() throws IOException {
        try (InputStream file = ContactImportHttpTest.class.getResourceAsStream("/vcard/contacts.vcf")) {
            return new String(file.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private static String contacts(String locale, String... emailsAndNames) {
        List<String> entries = new ArrayList<>();
        for (int index = 0; index < emailsAndNames.length; index += 2) {
            entries.add("{\"email\":\"" + emailsAndNames[index] + "\",\"name\":\"" + emailsAndNames[index + 1] + "\"}");
        }
        return "{\"locale\":\"" + locale + "\",\"contacts\":[" + String.join(",", entries) + "]}";
    }

    private static List<String> outcomes(JsonNode preview) {
        List<String> outcomes = new ArrayList<>();
        preview.path("contacts").forEach(entry -> outcomes.add(entry.path("outcome").asText()));
        return outcomes;
    }

    @BeforeEach
    void resetMailer() {
        mailer.available = true;
        mailer.failing = false;
    }

    @Test
    void previewAssessesTheFixtureWithoutSendingAnything() throws IOException {
        TestSession admin = fixtures().loginAsAdmin();
        int before = mailer.sent.size();
        ResponseEntity<String> preview = admin.postVCard(url(PREVIEW), fixture());

        assertThat(preview.getStatusCode().value()).as(preview.getBody()).isEqualTo(200);
        assertThat(preview.getHeaders().getCacheControl()).contains("no-store");
        JsonNode body = json(preview);
        assertThat(body.path("unreadableEntries").asInt()).isZero();
        assertThat(outcomes(body)).containsExactly("invite", "invite", "invite", "invite", "missing-email",
                "invalid-email", "duplicate-in-file");
        assertThat(body.path("contacts").get(1).path("email").asText()).isEqualTo("bert@example.test");
        assertThat(body.path("contacts").get(2).path("name").asText()).isEqualTo("Jörg Ümlaut-Straß");
        assertThat(body.path("contacts").get(5).path("email").asText()).isEqualTo("kein-at-zeichen");
        assertThat(mailer.sent).hasSize(before);
        assertThat(json(admin.get(url("/admin/invitations")))).noneMatch(invitation ->
                invitation.path("email").asText().equals("anna@example.test"));
    }

    @Test
    void confirmingInvitesContactsAndSuggestsTheirNames() {
        TestSession admin = fixtures().loginAsAdmin();
        int before = mailer.sent.size();
        ResponseEntity<String> imported = admin.post(url(IMPORT),
                contacts("en", "carla@example.test", "Carla Beispiel", "dora@example.test", "Dora"));

        assertThat(imported.getStatusCode().value()).as(imported.getBody()).isEqualTo(200);
        JsonNode result = json(imported);
        assertThat(result.path("invited").asInt()).isEqualTo(2);
        assertThat(result.path("renewed").asInt()).isZero();
        assertThat(result.path("deliveryFailed").asInt()).isZero();
        assertThat(mailer.sent).hasSize(before + 2);
        assertThat(mailer.sent.getLast().locale()).isEqualTo(Locale.ENGLISH);

        String token = mailer.sent.get(before).token();
        JsonNode preview = json(fixtures().anonymous().post(url("/invitations/inspection"), "{\"token\":\"" + token + "\"}"));
        assertThat(preview.path("email").asText()).isEqualTo("carla@example.test");
        assertThat(preview.path("suggestedUserID").asText()).isEqualTo("Carla Beispiel");
    }

    @Test
    void everyReasonIsReportedAndExpiredInvitationsAreRenewed() {
        TestSession admin = fixtures().loginAsAdmin();
        fixtures().user("Has Account", "account@example.test", "correct-horse-battery");
        admin.post(url("/admin/invitations"), "{\"email\":\"open@example.test\"}");
        admin.post(url("/admin/invitations"), "{\"email\":\"expired@example.test\"}");
        String oldToken = mailer.sent.getLast().token();
        jdbc.update("UPDATE \"Invitation\" SET \"expiresAt\" = '2000-01-01T00:00:00Z' WHERE \"emailKey\" = 'expired@example.test'");

        JsonNode preview = json(admin.postVCard(url(PREVIEW), card("Konto", "ACCOUNT@example.test")
                + card("Offen", "open@example.test") + card("Abgelaufen", "expired@example.test")
                + "BEGIN:VCARD\r\nFN:Abgeschnitten\r\n"));
        assertThat(outcomes(preview)).containsExactly("has-account", "already-invited", "renew");
        assertThat(preview.path("unreadableEntries").asInt()).isEqualTo(1);

        JsonNode result = json(admin.post(url(IMPORT), contacts("de",
                "expired@example.test", "Ella Abgelaufen", "EXPIRED@example.test", "Doppelt",
                "account@example.test", "Konto", "open@example.test", "Offen", "kein-at-zeichen", "Kaputt")));
        assertThat(result.path("renewed").asInt()).isEqualTo(1);
        assertThat(result.path("invited").asInt()).isZero();
        List<String> reasons = new ArrayList<>();
        result.path("entries").forEach(entry -> reasons.add(entry.path("outcome").asText() + "/" + entry.path("reason").asText()));
        assertThat(reasons).containsExactly("renewed/null", "skipped/duplicate-in-request", "skipped/has-account",
                "skipped/already-invited", "skipped/invalid-email");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM \"Invitation\" WHERE \"emailKey\" = 'expired@example.test'",
                Integer.class)).isEqualTo(1);
        assertProblem(fixtures().anonymous().post(url("/invitations/inspection"), "{\"token\":\"" + oldToken + "\"}"),
                409, "invitation-not-usable");
    }

    @Test
    void failedDeliveriesAreCountedAndKeepTheInvitation() {
        TestSession admin = fixtures().loginAsAdmin();
        mailer.failing = true;
        JsonNode result = json(admin.post(url(IMPORT), contacts("de", "failing@example.test", "Fehl")));
        assertThat(result.path("deliveryFailed").asInt()).isEqualTo(1);
        assertThat(result.path("entries").get(0).path("outcome").asText()).isEqualTo("delivery-failed");
        assertThat(json(admin.get(url("/admin/invitations")))).anyMatch(invitation ->
                invitation.path("email").asText().equals("failing@example.test") && invitation.path("deliveryFailed").asBoolean());
    }

    @Test
    void rejectsUnreadableOversizedAndUnavailableImports() {
        TestSession admin = fixtures().loginAsAdmin();
        assertProblem(admin.postVCard(url(PREVIEW), "Hallo Welt"), 400, "contact-import-invalid");
        assertProblem(admin.postVCard(url(PREVIEW), "NOTE:" + "x".repeat(1024 * 1024)), 413, "contact-import-too-large");
        assertProblem(admin.postVCard(url(PREVIEW), card("X", "x@example.test").repeat(501)), 400, "contact-import-too-many");
        assertProblem(admin.post(url(IMPORT), "{\"contacts\":[]}"), 400, "invalid-request");

        mailer.available = false;
        assertProblem(admin.postVCard(url(PREVIEW), card("Anna", "anna@example.test")), 409, "invitation-delivery-unavailable");
        assertProblem(admin.post(url(IMPORT), contacts("de", "anna@example.test", "Anna")), 409, "invitation-delivery-unavailable");
    }

    @Test
    void onlyTheAdministratorMayImport() {
        TestSession user = fixtures().loginAsUser("Import User");
        assertThat(user.postVCard(url(PREVIEW), card("A", "a@example.test")).getStatusCode().value()).isEqualTo(403);
        assertThat(user.post(url(IMPORT), contacts("de", "a@example.test", "A")).getStatusCode().value()).isEqualTo(403);
        assertThat(fixtures().anonymous().postVCard(url(PREVIEW), card("A", "a@example.test")).getStatusCode().value())
                .isEqualTo(401);
        TestSession admin = fixtures().loginAsAdmin();
        assertThat(admin.postVCardWithoutCsrf(url(PREVIEW), card("A", "a@example.test")).getStatusCode().value())
                .isEqualTo(403);
    }

    @Test
    void previewsFiveHundredContactsWithinFiveSeconds() {
        TestSession admin = fixtures().loginAsAdmin();
        StringBuilder file = new StringBuilder();
        for (int index = 0; index < 500; index++) {
            String version = index % 2 == 0 ? "3.0" : "4.0";
            file.append("BEGIN:VCARD\r\nVERSION:").append(version).append("\r\nFN:Person ").append(index)
                    .append("\r\nN:Person;").append(index).append(";;;\r\nEMAIL;TYPE=HOME;PREF=1:person").append(index)
                    .append("@example.test\r\nTEL;TYPE=CELL,HOME:0000\r\nADR;TYPE=HOME:;;Weg 1;Stadt;;00000;Land\r\n")
                    .append("BDAY;VALUE=DATE:2000-01-01\r\nUID:").append(UUID.randomUUID()).append("\r\nEND:VCARD\r\n");
        }
        long start = System.nanoTime();
        ResponseEntity<String> preview = admin.postVCard(url(PREVIEW), file.toString());
        long millis = (System.nanoTime() - start) / 1_000_000;

        assertThat(preview.getStatusCode().value()).isEqualTo(200);
        assertThat(json(preview).path("contacts").size()).isEqualTo(500);
        assertThat(millis).isLessThan(5_000);
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
