package de.justvotes.accountmanagement.core.model;

import java.util.Locale;

public record EmailAddress(String value) {
    private static final int MIN_LENGTH = 3;
    private static final int MAX_LENGTH = 254;

    public EmailAddress {
        if (value == null || value.length() < MIN_LENGTH || value.length() > MAX_LENGTH) {
            throw new IllegalArgumentException("An email address must contain 3 to 254 characters.");
        }
        int at = value.indexOf('@');
        if (at <= 0 || at != value.lastIndexOf('@') || at == value.length() - 1) {
            throw new IllegalArgumentException("An email address must contain exactly one @ with text before and after it.");
        }
        if (!value.strip().equals(value)) {
            throw new IllegalArgumentException("An email address must not start or end with whitespace.");
        }
    }

    public static EmailAddress of(String value) {
        return new EmailAddress(value);
    }

    public String normalized() {
        return value.toLowerCase(Locale.ROOT);
    }
}
