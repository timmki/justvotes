package de.justvotes.adapters.pollmanagement.infra.in.http;

import de.justvotes.adapters.shared.infra.in.http.OpaqueIdCodec;
import de.justvotes.api.v1.model.Option;
import de.justvotes.pollmanagement.core.model.Poll;

import java.time.OffsetDateTime;

final class PollResponseMapper {
    private PollResponseMapper() {
    }

    static de.justvotes.api.v1.model.Poll map(Poll poll) {
        var group = new de.justvotes.api.v1.model.TemplateGroup(OpaqueIdCodec.encode("g", poll.templateGroup().id().value()), poll.templateGroup().name(), "");
        return new de.justvotes.api.v1.model.Poll(OpaqueIdCodec.encode("p", poll.id().value()), poll.title(), poll.visibility().name().toLowerCase(), poll.state().name().toLowerCase(), group,
                poll.templateSnapshotOptions().stream().map(PollResponseMapper::option).toList(), poll.options().stream().map(PollResponseMapper::option).toList())
                .endsAt(poll.endsAt() == null ? null : OffsetDateTime.ofInstant(poll.endsAt(), java.time.ZoneOffset.UTC));
    }

    private static Option option(Poll.Option option) {
        return new Option(option.number(), option.text());
    }
}
