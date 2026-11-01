package de.justvotes.accountmanagement.core.model;

import java.util.Objects;

/**
 * An invitation created or renewed for an imported contact.
 */
public record ContactInvitation(IssuedInvitation issued, boolean renewed) {
    public ContactInvitation {
        Objects.requireNonNull(issued, "A contact invitation requires the issued invitation.");
    }
}
