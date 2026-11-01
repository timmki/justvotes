package de.justvotes.accountmanagement.core.model;

import java.util.Optional;

/**
 * A contact read from an imported address book: its position in the file, its name and its preferred
 * email address as written there. Nothing else of the contact is kept.
 */
public record ContactCandidate(int position, Optional<String> name, Optional<String> email) {
    public ContactCandidate {
        if (position < 1) {
            throw new IllegalArgumentException("A contact position starts at 1.");
        }
        name = name.map(String::strip).filter(value -> !value.isEmpty());
        email = email.map(String::strip).filter(value -> !value.isEmpty());
    }
}
