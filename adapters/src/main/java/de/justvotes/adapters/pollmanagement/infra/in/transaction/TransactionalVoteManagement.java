package de.justvotes.adapters.pollmanagement.infra.in.transaction;

import de.justvotes.pollmanagement.core.model.*;
import de.justvotes.pollmanagement.core.ports.in.ManageVotes;
import de.justvotes.pollmanagement.core.ports.in.ViewVotes;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

public class TransactionalVoteManagement implements ManageVotes, ViewVotes {
    private final ManageVotes commands;
    private final ViewVotes queries;

    public TransactionalVoteManagement(ManageVotes commands, ViewVotes queries) {
        this.commands = commands;
        this.queries = queries;
    }

    @Override
    @Transactional
    public void changeIdentity(Identity oldIdentity, Identity newIdentity) {
        commands.changeIdentity(oldIdentity, newIdentity);
    }

    @Override
    @Transactional
    public VoteOutcome castOrReplace(Poll.PollId pollId, Identity identity, int optionNumber) {
        return commands.castOrReplace(pollId, identity, optionNumber);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Vote> currentVote(Poll.PollId pollId, Identity identity) {
        return queries.currentVote(pollId, identity);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AuditEntry> publicAudit(Poll.PollId pollId) {
        return queries.publicAudit(pollId);
    }
}
