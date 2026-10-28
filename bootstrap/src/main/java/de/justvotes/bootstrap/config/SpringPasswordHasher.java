package de.justvotes.bootstrap.config;

import de.justvotes.accountmanagement.core.model.PasswordHash;
import de.justvotes.accountmanagement.core.ports.out.PasswordHasher;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.DelegatingPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.crypto.password.Pbkdf2PasswordEncoder;

import java.util.Map;

/**
 * Hashes new passwords with PBKDF2, which has no input length limit unlike BCrypt's 72 bytes, and
 * still verifies the BCrypt hash configured for the initial administrator.
 */
public final class SpringPasswordHasher implements PasswordHasher {
    static final String DEFAULT_ID = "pbkdf2@SpringSecurity_v5_8";
    static final String BCRYPT_ID = "bcrypt";
    private final DelegatingPasswordEncoder encoder;

    public SpringPasswordHasher() {
        Map<String, PasswordEncoder> encoders = Map.of(
                DEFAULT_ID, Pbkdf2PasswordEncoder.defaultsForSpringSecurity_v5_8(),
                BCRYPT_ID, new BCryptPasswordEncoder());
        encoder = new DelegatingPasswordEncoder(DEFAULT_ID, encoders);
    }

    /**
     * Prefixes a configured BCrypt hash so the delegating encoder can recognise it.
     */
    public static String bcrypt(String bcryptHash) {
        return "{" + BCRYPT_ID + "}" + bcryptHash;
    }

    @Override
    public PasswordHash hash(String rawPassword) {
        return PasswordHash.of(encoder.encode(rawPassword));
    }

    @Override
    public boolean matches(String rawPassword, PasswordHash hash) {
        try {
            return encoder.matches(rawPassword, hash.value());
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    @Override
    public boolean needsUpgrade(PasswordHash hash) {
        return encoder.upgradeEncoding(hash.value());
    }
}
