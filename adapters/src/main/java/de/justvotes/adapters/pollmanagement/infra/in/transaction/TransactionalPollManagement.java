package de.justvotes.adapters.pollmanagement.infra.in.transaction;

import de.justvotes.adapters.sqlite.SqliteRetryingTransaction;
import de.justvotes.pollmanagement.core.model.Poll.PollId;
import de.justvotes.pollmanagement.core.model.Poll.TemplateGroupId;
import de.justvotes.pollmanagement.core.model.Poll;
import de.justvotes.pollmanagement.core.model.PollSummary;
import de.justvotes.pollmanagement.core.ports.in.ManagePolls;
import de.justvotes.pollmanagement.core.ports.in.ViewPolls;

import java.time.Instant;
import java.util.List;

public class TransactionalPollManagement implements ManagePolls, ViewPolls {
    private final ManagePolls commands;
    private final ViewPolls queries;
    private final SqliteRetryingTransaction transactions;

    public TransactionalPollManagement(ManagePolls commands, ViewPolls queries, SqliteRetryingTransaction transactions) {
        this.commands = commands;
        this.queries = queries;
        this.transactions = transactions;
    }

    @Override
    public Poll createDraft(String title, TemplateGroupId templateGroupId, String systemAdmin) {
        return transactions.execute(() -> commands.createDraft(title, templateGroupId, systemAdmin));
    }

    @Override
    public Poll replaceDraftOptions(PollId pollId, List<String> optionTexts) {
        return transactions.execute(() -> commands.replaceDraftOptions(pollId, optionTexts));
    }

    @Override
    public Poll makePrivate(PollId pollId) {
        return transactions.execute(() -> commands.makePrivate(pollId));
    }

    @Override
    public Poll publish(PollId pollId, String admin, Instant endsAt) {
        return transactions.execute(() -> commands.publish(pollId, admin, endsAt));
    }

    @Override
    public int expireDuePolls(Instant now) {
        return transactions.execute(() -> commands.expireDuePolls(now));
    }

    @Override
    public Poll archive(PollId id, String admin) {
        return transactions.execute(() -> commands.archive(id, admin));
    }

    @Override
    public Poll restoreFromArchive(PollId id, String admin) {
        return transactions.execute(() -> commands.restoreFromArchive(id, admin));
    }

    @Override
    public Poll changeExpiry(PollId id, Instant endsAt, String admin) {
        return transactions.execute(() -> commands.changeExpiry(id, endsAt, admin));
    }

    @Override
    public Poll reopen(PollId id, Instant now, String admin) {
        return transactions.execute(() -> commands.reopen(id, now, admin));
    }

    @Override
    public Poll softDelete(PollId id, String admin) {
        return transactions.execute(() -> commands.softDelete(id, admin));
    }

    @Override
    public Poll restore(PollId id, String admin) {
        return transactions.execute(() -> commands.restore(id, admin));
    }

    @Override
    public void permanentlyDelete(PollId id, boolean confirmed, boolean repeated) {
        transactions.execute(() -> {
            commands.permanentlyDelete(id, confirmed, repeated);
            return null;
        });
    }

    @Override
    public List<Poll> draftsCreatedBy(String systemAdmin) {
        return transactions.executeReadOnly(() -> queries.draftsCreatedBy(systemAdmin));
    }

    @Override
    public List<PollSummary> publicPolls() {
        return transactions.execute(() -> queries.publicPolls());
    }

    @Override
    public Poll publicPoll(PollId pollId) {
        return transactions.execute(() -> queries.publicPoll(pollId));
    }

    @Override
    public List<Poll> pollsCreatedBy(String admin) {
        return transactions.executeReadOnly(() -> queries.pollsCreatedBy(admin));
    }
}
