package de.justvotes.pollmanagement.core.ports.out;

import de.justvotes.pollmanagement.core.model.PollPublished;

public interface PollEventPublisher {
    void publish(PollPublished event);
}
