package de.justvotes.bootstrap;

import de.justvotes.accountmanagement.core.model.PasswordHash;
import de.justvotes.bootstrap.config.SpringPasswordHasher;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;

class SpringPasswordHasherTest {
    private final SpringPasswordHasher hasher = new SpringPasswordHasher();

    @Test
    void hashesLongMultibytePasswordsBeyondTheBcryptLimit() {
        String password = "ä".repeat(64);
        PasswordHash hash = hasher.hash(password);

        assertThat(hash.value()).startsWith("{pbkdf2@SpringSecurity_v5_8}").doesNotContain(password);
        assertThat(hasher.matches(password, hash)).isTrue();
        assertThat(hasher.matches("ä".repeat(63) + "a", hash)).isFalse();
        assertThat(hasher.needsUpgrade(hash)).isFalse();
    }

    @Test
    void verifiesConfiguredBcryptHashesAndMarksThemForUpgrade() {
        PasswordHash configured = PasswordHash.of(SpringPasswordHasher.bcrypt(new BCryptPasswordEncoder().encode("password")));
        assertThat(hasher.matches("password", configured)).isTrue();
        assertThat(hasher.matches("wrong", configured)).isFalse();
        assertThat(hasher.needsUpgrade(configured)).isTrue();
    }

    @Test
    void rejectsUnknownHashFormatsWithoutFailing() {
        assertThat(hasher.matches("password", PasswordHash.of("plain"))).isFalse();
    }
}
