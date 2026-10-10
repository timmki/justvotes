package de.justvotes.adapters.pollmanagement.infra.in.transaction;

import de.justvotes.adapters.sqlite.SqliteRetryingTransaction;
import de.justvotes.pollmanagement.core.model.*;
import de.justvotes.pollmanagement.core.model.Poll.PollId;
import de.justvotes.pollmanagement.core.ports.in.ManageVotes;
import de.justvotes.pollmanagement.core.ports.in.ViewVotes;

import java.util.List;
import java.util.Optional;

public class TransactionalVoteManagement implements ManageVotes, ViewVotes {
    private final ManageVotes commands;
    private final ViewVotes queries;
    private final SqliteRetryingTransaction transactions;

    public TransactionalVoteManagement(ManageVotes commands, ViewVotes queries, SqliteRetryingTransaction transactions) {
        this.commands = commands;
        this.queries = queries;
        this.transactions = transactions;
    }

    @Override
    public void changeIdentity(Identity oldIdentity, Identity newIdentity) {
        transactions.execute(() -> {
            commands.changeIdentity(oldIdentity, newIdentity);
            return null;
        });
    }

    @Override
    public VoteOutcome castOrReplace(PollId pollId, Identity identity, int optionNumber) {
        return transactions.execute(() -> commands.castOrReplace(pollId, identity, optionNumber));
    }

    @Override
    public void withdrawVote(PollId pollId, Identity identity) {
        transactions.execute(() -> {
            commands.withdrawVote(pollId, identity);
            return null;
        });
    }

    @Override
    public List<PersonalVote> currentVotes(Identity identity) {
        return transactions.execute(() -> queries.currentVotes(identity));
    }

    @Override
    public Optional<Vote> currentVote(PollId pollId, Identity identity) {
        return transactions.executeReadOnly(() -> queries.currentVote(pollId, identity));
    }

    @Override
    public PollResults results(PollId pollId, Identity identity) {
        return transactions.execute(() -> queries.results(pollId, identity));
    }

    @Override
    public List<AuditEntry> publicAudit(PollId pollId) {
        return transactions.execute(() -> queries.publicAudit(pollId));
    }
}
