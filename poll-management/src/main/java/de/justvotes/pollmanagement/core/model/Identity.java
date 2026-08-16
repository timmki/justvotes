package de.justvotes.pollmanagement.core.model;

import java.util.Locale;
import java.util.regex.Pattern;

public record Identity(String value) {
    private static final Pattern FORMAT = Pattern.compile("[a-z0-9_-]{3,32}");

    public Identity {
        value = value == null ? null : value.trim().toLowerCase(Locale.ROOT);
        if (value == null || !FORMAT.matcher(value).matches())
            throw new IllegalArgumentException("A user ID must contain 3 to 32 lowercase letters, numbers, underscores, or hyphens.");
    }

    public static Identity of(String value) {
        return new Identity(value);
    }
}
