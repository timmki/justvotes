package de.justvotes.adapters.pollmanagement.infra.in.transaction;

import de.justvotes.pollmanagement.core.model.Poll;
import de.justvotes.pollmanagement.core.ports.in.ManagePolls;
import de.justvotes.pollmanagement.core.ports.in.ViewPolls;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public class TransactionalPollManagement implements ManagePolls, ViewPolls {
    private final ManagePolls commands;
    private final ViewPolls queries;

    public TransactionalPollManagement(ManagePolls commands, ViewPolls queries) {
        this.commands = commands;
        this.queries = queries;
    }

    @Override
    @Transactional
    public Poll createDraft(String title, Poll.TemplateGroupId templateGroupId, String systemAdmin) {
        return commands.createDraft(title, templateGroupId, systemAdmin);
    }

    @Override
    @Transactional
    public Poll replaceDraftOptions(Poll.PollId pollId, List<String> optionTexts) {
        return commands.replaceDraftOptions(pollId, optionTexts);
    }

    @Override
    @Transactional
    public Poll publish(Poll.PollId pollId, String systemAdmin) {
        return commands.publish(pollId, systemAdmin);
    }

    @Override
    @Transactional
    public Poll makePrivate(Poll.PollId pollId) {
        return commands.makePrivate(pollId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Poll> draftsCreatedBy(String systemAdmin) {
        return queries.draftsCreatedBy(systemAdmin);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Poll> publicPolls() {
        return queries.publicPolls();
    }

    @Override
    @Transactional(readOnly = true)
    public Poll publicPoll(Poll.PollId pollId) {
        return queries.publicPoll(pollId);
    }
}
