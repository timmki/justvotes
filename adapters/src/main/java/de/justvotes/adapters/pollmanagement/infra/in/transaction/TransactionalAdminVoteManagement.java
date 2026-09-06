package de.justvotes.adapters.pollmanagement.infra.in.transaction;

import de.justvotes.pollmanagement.core.model.AdminVotePage;
import de.justvotes.pollmanagement.core.ports.in.ManageAdminVotes;
import de.justvotes.pollmanagement.core.ports.in.ViewAdminVotes;
import de.justvotes.adapters.sqlite.SqliteRetryingTransaction;

public class TransactionalAdminVoteManagement implements ManageAdminVotes, ViewAdminVotes {
    private final ManageAdminVotes commands;
    private final ViewAdminVotes queries;
    private final SqliteRetryingTransaction transactions;

    public TransactionalAdminVoteManagement(ManageAdminVotes commands, ViewAdminVotes queries,
                                            SqliteRetryingTransaction transactions) {
        this.commands = commands;
        this.queries = queries;
        this.transactions = transactions;
    }

    @Override
    public void removeAdminVote(long voteId, String adminId, String reason) {
        transactions.execute(() -> {
            commands.removeAdminVote(voteId, adminId, reason);
            return null;
        });
    }

    @Override
    public AdminVotePage adminVotes(int page, int size) {
        return transactions.executeReadOnly(() -> queries.adminVotes(page, size));
    }
}
