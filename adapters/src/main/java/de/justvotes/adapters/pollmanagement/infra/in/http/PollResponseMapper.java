package de.justvotes.adapters.pollmanagement.infra.in.http;

import de.justvotes.adapters.shared.infra.in.http.OpaqueIdCodec;
import de.justvotes.api.v1.model.Option;
import de.justvotes.api.v1.model.TemplateGroup;
import de.justvotes.pollmanagement.core.model.Poll;
import de.justvotes.pollmanagement.core.model.PollSummary;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

final class PollResponseMapper {
    private PollResponseMapper() {
    }

    static de.justvotes.api.v1.model.Poll map(Poll poll) {
        return map(new PollSummary(
                poll.id(), poll.title(), poll.visibility(), poll.state(), poll.createdAt(), poll.endsAt(), poll.templateGroup(),
                poll.templateSnapshotOptions(), poll.options(), poll.votes().size()));
    }

    static de.justvotes.api.v1.model.Poll map(PollSummary poll) {
        var group = new TemplateGroup(OpaqueIdCodec.encode("g", poll.templateGroup().id().value()), poll.templateGroup().name(), poll.templateGroup().description());
        return new de.justvotes.api.v1.model.Poll(OpaqueIdCodec.encode("p", poll.id().value()), poll.title(), poll.visibility().name().toLowerCase(), poll.state().name().toLowerCase(),
                OffsetDateTime.ofInstant(poll.createdAt(), ZoneOffset.UTC),
                poll.endsAt() == null ? null : OffsetDateTime.ofInstant(poll.endsAt(), ZoneOffset.UTC), poll.totalVotes(), group,
                poll.templateSnapshotOptions().stream().map(PollResponseMapper::option).toList(), poll.options().stream().map(PollResponseMapper::option).toList());
    }

    private static Option option(Poll.Option option) {
        return new Option(option.number(), option.text());
    }
}
