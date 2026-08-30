package de.justvotes.pollmanagement.core.ports.in;

public interface ManageAdminVotes {
    void removeAdminVote(long voteId, String adminId, String reason);
}
