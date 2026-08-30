package de.justvotes.adapters.pollmanagement.infra.out.persistence;

import de.justvotes.pollmanagement.core.model.AuditEntry;
import de.justvotes.pollmanagement.core.model.Poll;
import de.justvotes.pollmanagement.core.ports.out.PollAuditRepository;

import java.util.List;

public final class JpaPollAuditAdapter implements PollAuditRepository {
    private final SpringDataPollDomainEventRepository events;

    public JpaPollAuditAdapter(SpringDataPollDomainEventRepository events) {
        this.events = events;
    }

    @Override
    public List<AuditEntry> findByPollId(Poll.PollId pollId) {
        return events.findAllByPollIdOrderByCreatedAtAscIdAsc(pollId.value()).stream().map(event -> new AuditEntry(
                event.actorId(), event.createdAt(), event.eventType(), event.metadata(), event.reason(),
                event.voteUserId(), event.voteOptionNumber(), event.voteVotedAt())).toList();
    }
}
