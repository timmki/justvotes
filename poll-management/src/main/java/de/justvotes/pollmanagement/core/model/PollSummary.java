package de.justvotes.pollmanagement.core.model;

import de.justvotes.pollmanagement.core.model.Poll.Option;
import de.justvotes.pollmanagement.core.model.Poll.PollId;
import de.justvotes.pollmanagement.core.model.Poll.State;
import de.justvotes.pollmanagement.core.model.Poll.TemplateGroup;
import de.justvotes.pollmanagement.core.model.Poll.Visibility;

import java.time.Instant;
import java.util.List;

public record PollSummary(
        PollId id,
        String title,
        Visibility visibility,
        State state,
        Instant createdAt,
        Instant endsAt,
        TemplateGroup templateGroup,
        List<Option> templateSnapshotOptions,
        List<Option> options,
        int totalVotes) {

    public PollSummary {
        templateSnapshotOptions = List.copyOf(templateSnapshotOptions);
        options = List.copyOf(options);
    }
}
