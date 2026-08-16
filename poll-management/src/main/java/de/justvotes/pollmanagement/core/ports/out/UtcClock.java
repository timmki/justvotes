package de.justvotes.pollmanagement.core.ports.out;

import java.time.Instant;

public interface UtcClock {
    Instant now();
}
