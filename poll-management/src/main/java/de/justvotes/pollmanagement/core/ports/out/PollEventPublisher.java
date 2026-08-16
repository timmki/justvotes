package de.justvotes.pollmanagement.core.ports.out;

import de.justvotes.pollmanagement.core.event.PollDomainEvent;

public interface PollEventPublisher {
    void publish(PollDomainEvent event);
}
