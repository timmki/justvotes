package de.justvotes.adapters.pollmanagement.infra.in.transaction;

import de.justvotes.pollmanagement.core.model.AdminVotePage;
import de.justvotes.pollmanagement.core.ports.in.ManageAdminVotes;
import de.justvotes.pollmanagement.core.ports.in.ViewAdminVotes;
import org.springframework.transaction.annotation.Transactional;

public class TransactionalAdminVoteManagement implements ManageAdminVotes, ViewAdminVotes {
    private final ManageAdminVotes commands;
    private final ViewAdminVotes queries;

    public TransactionalAdminVoteManagement(ManageAdminVotes commands, ViewAdminVotes queries) {
        this.commands = commands;
        this.queries = queries;
    }

    @Override
    @Transactional
    public void removeAdminVote(long voteId, String adminId, String reason) {
        commands.removeAdminVote(voteId, adminId, reason);
    }

    @Override
    @Transactional(readOnly = true)
    public AdminVotePage adminVotes(int page, int size) {
        return queries.adminVotes(page, size);
    }
}
