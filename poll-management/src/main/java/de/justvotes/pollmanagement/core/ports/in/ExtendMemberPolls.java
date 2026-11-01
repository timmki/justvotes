package de.justvotes.pollmanagement.core.ports.in;

public interface ExtendMemberPolls {
    /**
     * Adds the new member as option to every open poll created from the members group.
     */
    void memberJoined(String identity);
}
