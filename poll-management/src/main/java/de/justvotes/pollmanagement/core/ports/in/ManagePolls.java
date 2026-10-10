package de.justvotes.pollmanagement.core.ports.in;

import de.justvotes.pollmanagement.core.model.Poll;
import de.justvotes.pollmanagement.core.model.Poll.PollId;
import de.justvotes.pollmanagement.core.model.Poll.TemplateGroupId;

import java.time.Instant;
import java.util.List;

public interface ManagePolls {
    Poll createDraft(String title, TemplateGroupId templateGroupId, String systemAdmin);

    Poll replaceDraftOptions(PollId pollId, List<String> optionTexts);

    Poll makePrivate(PollId pollId);

    Poll publish(PollId pollId, String systemAdmin, Instant endsAt);

    int expireDuePolls(Instant now);

    Poll archive(PollId pollId, String systemAdmin);

    Poll restoreFromArchive(PollId pollId, String systemAdmin);

    Poll changeExpiry(PollId pollId, Instant endsAt, String systemAdmin);

    Poll reopen(PollId pollId, Instant now, String systemAdmin);

    Poll softDelete(PollId pollId, String systemAdmin);

    Poll restore(PollId pollId, String systemAdmin);

    void permanentlyDelete(PollId pollId, boolean confirmed, boolean confirmationRepeated);
}
