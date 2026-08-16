package de.justvotes.adapters.pollmanagement.infra.in.transaction;

import de.justvotes.pollmanagement.core.model.Poll;
import de.justvotes.pollmanagement.core.ports.in.ManagePolls;
import de.justvotes.pollmanagement.core.ports.in.ViewPolls;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.time.Instant;

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
    public Poll makePrivate(Poll.PollId pollId) {
        return commands.makePrivate(pollId);
    }

    @Override @Transactional public Poll publish(Poll.PollId pollId, String admin, Instant endsAt) { return commands.publish(pollId, admin, endsAt); }
    @Override @Transactional public int expireDuePolls(Instant now) { return commands.expireDuePolls(now); }
    @Override @Transactional public Poll archive(Poll.PollId id, String admin) { return commands.archive(id, admin); }
    @Override @Transactional public Poll restoreFromArchive(Poll.PollId id, String admin) { return commands.restoreFromArchive(id, admin); }
    @Override @Transactional public Poll changeExpiry(Poll.PollId id, Instant endsAt, String admin) { return commands.changeExpiry(id, endsAt, admin); }
    @Override @Transactional public Poll reopen(Poll.PollId id, Instant now, String admin) { return commands.reopen(id, now, admin); }
    @Override @Transactional public Poll softDelete(Poll.PollId id, String admin) { return commands.softDelete(id, admin); }
    @Override @Transactional public Poll restore(Poll.PollId id, String admin) { return commands.restore(id, admin); }
    @Override @Transactional public void permanentlyDelete(Poll.PollId id, boolean confirmed, boolean repeated) { commands.permanentlyDelete(id, confirmed, repeated); }

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

    @Override @Transactional(readOnly = true) public List<Poll> pollsCreatedBy(String admin) { return queries.pollsCreatedBy(admin); }
}
