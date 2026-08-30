package de.justvotes.pollmanagement.core.ports.in;

import de.justvotes.pollmanagement.core.model.AdminVotePage;

public interface ViewAdminVotes {
    AdminVotePage adminVotes(int page, int size);
}
