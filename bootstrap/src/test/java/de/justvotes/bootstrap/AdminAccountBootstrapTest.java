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
    private static ConfigurableApplicationContext start(String database, String username, String hash, boolean reset) {
        SpringApplication application = new SpringApplication(JustVotesApplication.class);
        return application.run("--spring.main.web-application-type=none", "--spring.main.banner-mode=off",
                "--spring.datasource.url=jdbc:sqlite:" + database, "--ADMIN_USERNAME=" + username,
                "--ADMIN_PASSWORD_HASH=" + hash, "--justvotes.admin.password-reset=" + reset);
    }

    private static Account admin(ConfigurableApplicationContext context) {
        return context.getBean(AccountRepository.class).findAdmin().orElseThrow();
    }

    @Test
    void createsTheAdministratorOnceAndResetsItsPasswordOnlyOnRequest() {
        String database = Path.of("target", "admin-bootstrap-" + UUID.randomUUID() + ".db").toString();
        BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder();
        try (ConfigurableApplicationContext context = start(database, "systemadmin", bcrypt.encode("first-password"), false)) {
            Account admin = admin(context);
            assertThat(admin.name().value()).isEqualTo("systemadmin");
            assertThat(admin.identity()).isEmpty();
            assertThat(admin.passwordHash().value()).startsWith("{bcrypt}");
            assertThat(context.getBean(PasswordHasher.class).matches("first-password", admin.passwordHash())).isTrue();
        }
        try (ConfigurableApplicationContext context = start(database, "systemadmin", bcrypt.encode("second-password"), false)) {
            Account admin = admin(context);
            assertThat(context.getBean(PasswordHasher.class).matches("first-password", admin.passwordHash())).isTrue();
            assertThat(admin.sessionEpoch()).isZero();
        }
        try (ConfigurableApplicationContext context = start(database, "systemadmin", bcrypt.encode("second-password"), true)) {
            Account admin = admin(context);
            assertThat(context.getBean(PasswordHasher.class).matches("second-password", admin.passwordHash())).isTrue();
            assertThat(admin.sessionEpoch()).isEqualTo(1);
        }
    }

    @Test
    void refusesToStartWithoutValidAdministratorConfiguration() {
        String database = Path.of("target", "admin-bootstrap-" + UUID.randomUUID() + ".db").toString();
        assertThatThrownBy(() -> start(database, " ", new BCryptPasswordEncoder().encode("x"), false))
                .hasStackTraceContaining("ADMIN_USERNAME must not be blank");
        assertThatThrownBy(() -> start(database, "systemadmin", "not-a-bcrypt-hash", false))
                .hasStackTraceContaining("ADMIN_PASSWORD_HASH must be a BCrypt hash");
    }
}
