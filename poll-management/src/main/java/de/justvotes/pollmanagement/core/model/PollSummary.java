package de.justvotes.pollmanagement.core.model;

import java.time.Instant;
import java.util.List;

public record PollSummary(
        Poll.PollId id,
        String title,
        Poll.Visibility visibility,
        Poll.State state,
        Instant createdAt,
        Instant endsAt,
        Poll.TemplateGroup templateGroup,
        List<Poll.Option> templateSnapshotOptions,
        List<Poll.Option> options,
        int totalVotes) {

    public PollSummary {
        templateSnapshotOptions = List.copyOf(templateSnapshotOptions);
        options = List.copyOf(options);
    }
}
