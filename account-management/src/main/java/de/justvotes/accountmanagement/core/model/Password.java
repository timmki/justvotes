package de.justvotes.accountmanagement.core.model;

/**
 * A new password chosen by a person. It is only held transiently and never persisted.
 */
public record Password(String value) {
    public static final int MIN_LENGTH = 12;
    public static final int MAX_LENGTH = 128;

    public Password {
        if (value == null) {
            throw new IllegalArgumentException("A password must not be empty.");
        }
        int length = value.codePointCount(0, value.length());
        if (length < MIN_LENGTH || length > MAX_LENGTH || value.isBlank()) {
            throw new IllegalArgumentException("A password must contain 12 to 128 characters and not only whitespace.");
        }
    }

    public static Password of(String value) {
        return new Password(value);
    }

    @Override
    public String toString() {
        return "Password[***]";
    }
}
