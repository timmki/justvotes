package de.justvotes.accountmanagement.core.model;

import java.util.Objects;
import java.util.Optional;

/**
 * The outcome for one imported contact, with its email address if it is valid.
 */
public record ContactAssessment(ContactCandidate candidate, Optional<EmailAddress> email, ContactOutcome outcome) {
    public ContactAssessment {
        Objects.requireNonNull(candidate, "An assessment requires a contact.");
        Objects.requireNonNull(email, "An assessment requires an email value.");
        Objects.requireNonNull(outcome, "An assessment requires an outcome.");
    }
}
