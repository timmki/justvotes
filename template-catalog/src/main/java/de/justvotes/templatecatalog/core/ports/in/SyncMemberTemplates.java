package de.justvotes.templatecatalog.core.ports.in;

public interface SyncMemberTemplates {
    /**
     * Ensures the members group contains an option template for the given identity.
     */
    void memberJoined(String identity);
}
