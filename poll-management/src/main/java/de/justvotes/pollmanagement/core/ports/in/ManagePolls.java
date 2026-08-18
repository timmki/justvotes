package de.justvotes.pollmanagement.core.ports.in;

import de.justvotes.pollmanagement.core.model.Poll;

import java.time.Instant;
import java.util.List;

public interface ManagePolls {
    Poll createDraft(String title, Poll.TemplateGroupId templateGroupId, String systemAdmin);

    Poll replaceDraftOptions(Poll.PollId pollId, List<String> optionTexts);

    Poll makePrivate(Poll.PollId pollId);

    Poll publish(Poll.PollId pollId, String systemAdmin, Instant endsAt);

    int expireDuePolls(Instant now);

    Poll archive(Poll.PollId pollId, String systemAdmin);

    Poll restoreFromArchive(Poll.PollId pollId, String systemAdmin);

    Poll changeExpiry(Poll.PollId pollId, Instant endsAt, String systemAdmin);

    Poll reopen(Poll.PollId pollId, Instant now, String systemAdmin);

    Poll softDelete(Poll.PollId pollId, String systemAdmin);

    Poll restore(Poll.PollId pollId, String systemAdmin);

    void permanentlyDelete(Poll.PollId pollId, boolean confirmed, boolean confirmationRepeated);
}
