package de.justvotes.pollmanagement.core.model;

public record Identity(String value) {
    private static final int MAX_LENGTH = 64;

    public Identity {
        if (value == null || value.isEmpty() || value.codePointCount(0, value.length()) > MAX_LENGTH)
            throw new IllegalArgumentException("A user ID must contain 1 to 64 characters.");
    }

    public static Identity of(String value) {
        return new Identity(value);
    }
}
