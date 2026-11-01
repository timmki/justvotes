package de.justvotes.accountmanagement.core;

import de.justvotes.accountmanagement.core.model.ContactAssessment;
import de.justvotes.accountmanagement.core.model.ContactCandidate;
import de.justvotes.accountmanagement.core.model.ContactOutcome;
import de.justvotes.accountmanagement.core.model.EmailAddress;
import de.justvotes.accountmanagement.core.model.Invitation;
import de.justvotes.accountmanagement.core.ports.out.AccountRepository;
import de.justvotes.accountmanagement.core.ports.out.InvitationRepository;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * The rules deciding what an import does with a contact: invite it, renew its expired invitation, or skip it
 * with a reason.
 */
final class ContactInvitations {
    private final AccountRepository accounts;
    private final InvitationRepository invitations;

    ContactInvitations(AccountRepository accounts, InvitationRepository invitations) {
        this.accounts = accounts;
        this.invitations = invitations;
    }

    static Optional<EmailAddress> validEmail(String value) {
        try {
            return Optional.of(EmailAddress.of(value));
        } catch (IllegalArgumentException exception) {
            return Optional.empty();
        }
    }

    List<ContactAssessment> assess(List<ContactCandidate> contacts, Instant now) {
        List<ContactAssessment> assessments = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (ContactCandidate contact : contacts) {
            if (contact.email().isEmpty()) {
                assessments.add(new ContactAssessment(contact, Optional.empty(), ContactOutcome.MISSING_EMAIL));
                continue;
            }
            Optional<EmailAddress> email = validEmail(contact.email().get());
            if (email.isEmpty()) {
                assessments.add(new ContactAssessment(contact, Optional.empty(), ContactOutcome.INVALID_EMAIL));
                continue;
            }
            ContactOutcome outcome = ContactOutcome.DUPLICATE_IN_FILE;
            if (seen.add(email.get().normalized())) {
                outcome = outcome(email.get(), now);
            }
            assessments.add(new ContactAssessment(contact, email, outcome));
        }
        return assessments;
    }

    /**
     * Outcome for a valid address, independent of other contacts.
     */
    ContactOutcome outcome(EmailAddress email, Instant now) {
        if (accounts.existsByEmailKey(email.normalized())) {
            return ContactOutcome.HAS_ACCOUNT;
        }
        Optional<Invitation> open = invitations.findOpenByEmailKey(email.normalized());
        if (open.isEmpty()) {
            return ContactOutcome.INVITE;
        }
        if (open.get().isExpired(now)) {
            return ContactOutcome.RENEW;
        }
        return ContactOutcome.ALREADY_INVITED;
    }
}
