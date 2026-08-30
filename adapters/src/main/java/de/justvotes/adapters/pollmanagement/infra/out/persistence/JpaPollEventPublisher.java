package de.justvotes.adapters.pollmanagement.infra.out.persistence;

import de.justvotes.pollmanagement.core.event.PollDomainEvent;
import de.justvotes.pollmanagement.core.ports.out.PollEventPublisher;

import java.util.Objects;

public final class JpaPollEventPublisher implements PollEventPublisher {
    private final SpringDataPollDomainEventRepository events;

    public JpaPollEventPublisher(SpringDataPollDomainEventRepository events) {
        this.events = events;
    }

    @Override
    public void publish(PollDomainEvent event) {
        if (Objects.isNull(event)) {
            return;
        }
        events.save(new PollDomainEventEntity(event.pollId().value(), event.eventType(), event.actorId(), event.selection(), event.occurredAt()));
    }
}
