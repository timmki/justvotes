package de.justvotes.accountmanagement.core.model;

import java.util.Locale;
import java.util.regex.Pattern;

public record AccountName(String value) {
    private static final int MIN_LENGTH = 3;
    private static final int MAX_LENGTH = 32;
    private static final Pattern ALLOWED = Pattern.compile("[A-Za-z0-9._-]+");
    private static final Pattern DIGITS_ONLY = Pattern.compile("[0-9]+");

    public AccountName {
        if (value == null) {
            throw new IllegalArgumentException("An account name must not be empty.");
        }
        int length = value.codePointCount(0, value.length());
        if (length < MIN_LENGTH || length > MAX_LENGTH) {
            throw new IllegalArgumentException("An account name must contain 3 to 32 characters.");
        }
        if (!ALLOWED.matcher(value).matches()) {
            throw new IllegalArgumentException("An account name may only contain letters, digits, dots, underscores and hyphens.");
        }
        if (DIGITS_ONLY.matcher(value).matches()) {
            throw new IllegalArgumentException("An account name must not consist of digits only.");
        }
    }

    public static AccountName of(String value) {
        return new AccountName(value);
    }

    public String normalized() {
        return value.toLowerCase(Locale.ROOT);
    }
}
