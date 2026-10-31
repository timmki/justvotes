package de.justvotes.bootstrap;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.fasterxml.jackson.databind.JsonNode;
import de.justvotes.accountmanagement.core.model.EmailAddress;
import de.justvotes.accountmanagement.core.model.InvitationToken;
import de.justvotes.accountmanagement.core.ports.out.InvitationMailer;
import de.justvotes.bootstrap.support.AccountFixtures;
import de.justvotes.bootstrap.support.AccountHttpTestBase;
import de.justvotes.bootstrap.support.TestSession;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.slf4j.event.KeyValuePair;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
class SecurityEventLoggingTest extends AccountHttpTestBase {
    private static final Path DATABASE_PATH = Path.of("target", "security-events-" + UUID.randomUUID() + ".db");
    private static final List<String> TOKENS = new ArrayList<>();
    private final ListAppender<ILoggingEvent> appender = new ListAppender<>();

    @DynamicPropertySource
    static void applicationProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:sqlite:" + DATABASE_PATH);
        registry.add("ADMIN_EMAIL", () -> "systemadmin@example.test");
        registry.add("ADMIN_PASSWORD_HASH", () -> new BCryptPasswordEncoder().encode("password"));
    }

    @BeforeEach
    void attach() {
        appender.start();
        ((Logger) LoggerFactory.getLogger("justvotes.security")).addAppender(appender);
    }

    @AfterEach
    void detach() {
        ((Logger) LoggerFactory.getLogger("justvotes.security")).detachAppender(appender);
    }

    private List<String> events() {
        return appender.list.stream().map(event -> value(event, "event")).toList();
    }

    private static String value(ILoggingEvent event, String key) {
        List<KeyValuePair> pairs = event.getKeyValuePairs();
        if (pairs == null) return null;
        return pairs.stream().filter(pair -> pair.key.equals(key)).map(pair -> String.valueOf(pair.value)).findFirst().orElse(null);
    }

    private String everything() {
        return appender.list.stream().map(event -> event.getFormattedMessage() + " " + event.getKeyValuePairs())
                .collect(Collectors.joining("\n"));
    }

    @Test
    void recordsAllSecurityEventsWithoutSecrets() {
        String userPassword = AccountFixtures.USER_PASSWORD;
        String name = AccountFixtures.email("Logged");
        fixtures().userWithIdentity("Logged");
        TestSession anonymous = fixtures().anonymous();
        fixtures().attemptLogin(anonymous, "secret-password-typed-as-name", "wrong");
        for (int attempt = 0; attempt < 6; attempt++) {
            fixtures().attemptLogin(anonymous, "hammered", "wrong");
        }
        TestSession user = fixtures().login(name, userPassword);
        user.put(url("/session/password"), "{\"currentPassword\":\"" + userPassword + "\",\"newPassword\":\"next-secret-password\"}");
        user.post(url("/session/logout"));

        TestSession admin = fixtures().loginAsAdmin();
        JsonNode created = json(admin.post(url("/admin/invitations"), "{\"email\":\"logged-invite@example.test\"}"));
        String invitationId = created.path("invitationId").asText();
        admin.post(url("/admin/invitations/" + invitationId + "/resend"));
        admin.delete(url("/admin/invitations/" + invitationId));
        JsonNode second = json(admin.post(url("/admin/invitations"), "{\"email\":\"accepting@example.test\"}"));
        fixtures().anonymous().post(url("/invitations/acceptance"), "{\"token\":\"" + TOKENS.getLast()
                + "\",\"userID\":\"Accepting\",\"password\":\"accepting-password\"}");
        String accountId = null;
        for (JsonNode account : json(admin.get(url("/admin/accounts")))) {
            if (account.path("email").asText().equals(name)) accountId = account.path("accountId").asText();
        }
        admin.post(url("/admin/accounts/" + accountId + "/lock"));
        admin.post(url("/admin/accounts/" + accountId + "/unlock"));
        String oneTimePassword = json(admin.post(url("/admin/accounts/" + accountId + "/one-time-password"))).path("password").asText();

        assertThat(second.path("invitationId").asText()).isNotBlank();
        assertThat(events()).contains("login-failed", "login-throttled", "login", "password-changed", "logout",
                "invitation-issued", "invitation-resent", "invitation-revoked", "invitation-accepted",
                "account-locked", "account-unlocked", "one-time-password-set");
        String log = everything();
        assertThat(log).doesNotContain(userPassword, "next-secret-password", "accepting-password", "secret-password-typed-as-name",
                oneTimePassword, "{pbkdf2", "{bcrypt", "$2a$", name);
        for (String token : TOKENS) {
            assertThat(log).doesNotContain(token);
        }
        assertThat(appender.list.stream().filter(event -> "login-failed".equals(value(event, "event"))))
                .allSatisfy(event -> {
                    assertThat(value(event, "emailFingerprint")).hasSize(12);
                    assertThat(value(event, "email")).isNull();
                });
    }

    @TestConfiguration
    static class MailerConfiguration {
        @Bean
        @Primary
        InvitationMailer capturingMailer() {
            return new InvitationMailer() {
                @Override
                public boolean isAvailable() {
                    return true;
                }

                @Override
                public void send(EmailAddress recipient, InvitationToken token, Instant expiresAt, Locale locale) {
                    TOKENS.add(token.value());
                }
            };
        }
    }
}
