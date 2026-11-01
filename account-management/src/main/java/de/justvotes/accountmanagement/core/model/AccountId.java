package de.justvotes.accountmanagement.core.model;

public record AccountId(long value) {
    public AccountId {
        if (value <= 0) {
            throw new IllegalArgumentException("An account ID must be positive.");
        }
    }

    public static AccountId of(long value) {
        return new AccountId(value);
    }
}
