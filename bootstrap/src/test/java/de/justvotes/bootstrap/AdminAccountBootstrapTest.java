package de.justvotes.bootstrap;

import de.justvotes.accountmanagement.core.model.Account;
import de.justvotes.accountmanagement.core.ports.out.AccountRepository;
import de.justvotes.accountmanagement.core.ports.out.PasswordHasher;
import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.nio.file.Path;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AdminAccountBootstrapTest {
    private static ConfigurableApplicationContext start(String database, String email, String hash, boolean reset) {
        SpringApplication application = new SpringApplication(JustVotesApplication.class);
        return application.run("--spring.main.web-application-type=none", "--spring.main.banner-mode=off",
                "--spring.datasource.url=jdbc:sqlite:" + database, "--ADMIN_EMAIL=" + email,
                "--ADMIN_PASSWORD_HASH=" + hash, "--justvotes.admin.password-reset=" + reset);
    }

    private static Account admin(ConfigurableApplicationContext context) {
        return context.getBean(AccountRepository.class).findAdmin().orElseThrow();
    }

    @Test
    void createsTheAdministratorOnceAndResetsItsPasswordOnlyOnRequest() {
        String database = Path.of("target", "admin-bootstrap-" + UUID.randomUUID() + ".db").toString();
        BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder();
        try (ConfigurableApplicationContext context = start(database, "systemadmin@example.test", bcrypt.encode("first-password"), false)) {
            Account admin = admin(context);
            assertThat(admin.email().value()).isEqualTo("systemadmin@example.test");
            assertThat(admin.identity()).isEmpty();
            assertThat(admin.passwordHash().value()).startsWith("{bcrypt}");
            assertThat(context.getBean(PasswordHasher.class).matches("first-password", admin.passwordHash())).isTrue();
        }
        try (ConfigurableApplicationContext context = start(database, "systemadmin@example.test", bcrypt.encode("second-password"), false)) {
            Account admin = admin(context);
            assertThat(context.getBean(PasswordHasher.class).matches("first-password", admin.passwordHash())).isTrue();
            assertThat(admin.sessionEpoch()).isZero();
        }
        try (ConfigurableApplicationContext context = start(database, "systemadmin@example.test", bcrypt.encode("second-password"), true)) {
            Account admin = admin(context);
            assertThat(context.getBean(PasswordHasher.class).matches("second-password", admin.passwordHash())).isTrue();
            assertThat(admin.sessionEpoch()).isEqualTo(1);
        }
        try (ConfigurableApplicationContext context = start(database, "new-admin@example.test", bcrypt.encode("second-password"), false)) {
            Account admin = admin(context);
            assertThat(admin.email().value()).isEqualTo("new-admin@example.test");
            assertThat(context.getBean(PasswordHasher.class).matches("second-password", admin.passwordHash())).isTrue();
            assertThat(admin.sessionEpoch()).isEqualTo(1);
        }
    }

    @Test
    void refusesToStartWithoutValidAdministratorConfiguration() {
        String database = Path.of("target", "admin-bootstrap-" + UUID.randomUUID() + ".db").toString();
        assertThatThrownBy(() -> start(database, " ", new BCryptPasswordEncoder().encode("x"), false))
                .hasStackTraceContaining("ADMIN_EMAIL must be a valid email address");
        assertThatThrownBy(() -> start(database, "systemadmin", new BCryptPasswordEncoder().encode("x"), false))
                .hasStackTraceContaining("ADMIN_EMAIL must be a valid email address");
        assertThatThrownBy(() -> start(database, "systemadmin@example.test", "not-a-bcrypt-hash", false))
                .hasStackTraceContaining("ADMIN_PASSWORD_HASH must be a BCrypt hash");
    }
}
