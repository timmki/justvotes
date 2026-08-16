package de.justvotes.adapters.pollmanagement.infra.out.persistence;

import de.justvotes.pollmanagement.core.model.PollPublished;
import de.justvotes.pollmanagement.core.ports.out.PollEventPublisher;

public final class JpaPollEventPublisher implements PollEventPublisher {
    private final SpringDataPollDomainEventRepository events;

    public JpaPollEventPublisher(SpringDataPollDomainEventRepository events) {
        this.events = events;
    }

    @Override
    public void publish(PollPublished event) {
        events.save(new PollDomainEventEntity(event.pollId().value(), "PollPublished", event.actorId()));
    }
}
