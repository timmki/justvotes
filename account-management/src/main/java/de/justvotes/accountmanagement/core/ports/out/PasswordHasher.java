package de.justvotes.accountmanagement.core.ports.out;

import de.justvotes.accountmanagement.core.model.PasswordHash;

public interface PasswordHasher {
    PasswordHash hash(String rawPassword);

    boolean matches(String rawPassword, PasswordHash hash);

    boolean needsUpgrade(PasswordHash hash);
}
