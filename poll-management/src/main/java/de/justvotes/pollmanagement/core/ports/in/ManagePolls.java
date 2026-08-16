package de.justvotes.pollmanagement.core.ports.in;

import de.justvotes.pollmanagement.core.model.Poll;

import java.util.List;

public interface ManagePolls {
    Poll createDraft(String title, Poll.TemplateGroupId templateGroupId, String systemAdmin);

    Poll replaceDraftOptions(Poll.PollId pollId, List<String> optionTexts);

    Poll publish(Poll.PollId pollId, String systemAdmin);

    Poll makePrivate(Poll.PollId pollId);
}
