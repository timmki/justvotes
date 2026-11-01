package de.justvotes.accountmanagement.core.ports.out;

public interface MemberJoinedListener {
    /**
     * Called inside the acceptance of an invitation once the new user account is stored.
     */
    void memberJoined(String identity);
}
