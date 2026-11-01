package de.justvotes.accountmanagement.core.ports.in;

import de.justvotes.accountmanagement.core.model.ContactAssessment;
import de.justvotes.accountmanagement.core.model.ContactCandidate;
import de.justvotes.accountmanagement.core.model.ContactInvitation;

import java.util.List;

/**
 * Invites people from an imported address book.
 */
public interface InviteContacts {
    /**
     * Assesses every contact in file order without creating invitations or sending email.
     */
    List<ContactAssessment> assess(List<ContactCandidate> contacts);

    /**
     * Invites one selected contact or renews its expired invitation; the contact name becomes the suggested
     * display name. Throws {@code ContactSkippedException} when the contact can no longer be invited.
     */
    ContactInvitation inviteContact(String email, String name);
}
