package de.justvotes.accountmanagement.core.exception;

/**
 * A value entered for a new account breaks a rule; field and rule are stable codes for clients.
 */
public final class InvalidAccountInputException extends IllegalArgumentException {
    private final String field;
    private final String rule;

    public InvalidAccountInputException(String field, String rule, String message) {
        super(message);
        this.field = field;
        this.rule = rule;
    }

    public String field() {
        return field;
    }

    public String rule() {
        return rule;
    }
}
