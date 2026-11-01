package de.justvotes.accountmanagement.core;

import de.justvotes.accountmanagement.core.model.PasswordHash;
import de.justvotes.accountmanagement.core.ports.out.PasswordHasher;

/**
 * Reversible test hasher; hashes with the legacy prefix report that they need an upgrade.
 */
public final class FakePasswordHasher implements PasswordHasher {
    public static final String LEGACY_PREFIX = "{legacy}";
    private static final String PREFIX = "{fake}";

    @Override
    public PasswordHash hash(String rawPassword) {
        return PasswordHash.of(PREFIX + rawPassword);
    }

    @Override
    public boolean matches(String rawPassword, PasswordHash hash) {
        String value = hash.value();
        if (value.startsWith(LEGACY_PREFIX)) {
            return value.substring(LEGACY_PREFIX.length()).equals(rawPassword);
        }
        return value.equals(PREFIX + rawPassword);
    }

    @Override
    public boolean needsUpgrade(PasswordHash hash) {
        return hash.value().startsWith(LEGACY_PREFIX);
    }
}
