package de.justvotes.accountmanagement.core.model;

import de.justvotes.accountmanagement.core.exception.InvalidAccountInputException;

import java.util.Locale;

/**
 * The fixed voting identity owned by a user account.
 */
public record AccountIdentity(String value) {
    private static final String FIELD = "userID";
    private static final int MAX_LENGTH = 64;

    public AccountIdentity {
        if (value == null || value.isEmpty() || value.codePointCount(0, value.length()) > MAX_LENGTH) {
            throw new InvalidAccountInputException(FIELD, "length", "An identity must contain 1 to 64 characters.");
        }
        if (!value.strip().equals(value)) {
            throw new InvalidAccountInputException(FIELD, "whitespace", "An identity must not start or end with whitespace.");
        }
    }

    public static AccountIdentity of(String value) {
        return new AccountIdentity(value);
    }

    public String normalized() {
        return value.toLowerCase(Locale.ROOT);
    }
}
