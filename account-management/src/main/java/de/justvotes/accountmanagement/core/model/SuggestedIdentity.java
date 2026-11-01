package de.justvotes.accountmanagement.core.model;

import java.util.Optional;

/**
 * A display name suggested to an invited person, taken from an imported contact. It follows the rules of
 * {@link AccountIdentity} so that it can be accepted unchanged, but the person may still replace it.
 */
public record SuggestedIdentity(String value) {
    private static final int MAX_LENGTH = 64;

    public SuggestedIdentity {
        AccountIdentity.of(value);
    }

    public static SuggestedIdentity of(String value) {
        return new SuggestedIdentity(value);
    }

    /**
     * Turns a contact name into a suggestion: surrounding whitespace is removed and overly long names are cut
     * to 64 characters; nothing is suggested when no text remains.
     */
    public static Optional<SuggestedIdentity> fromContactName(String name) {
        if (name == null) {
            return Optional.empty();
        }
        String stripped = name.strip();
        if (stripped.codePointCount(0, stripped.length()) > MAX_LENGTH) {
            stripped = stripped.substring(0, stripped.offsetByCodePoints(0, MAX_LENGTH)).strip();
        }
        if (stripped.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(new SuggestedIdentity(stripped));
    }
}
