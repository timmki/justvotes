package de.justvotes.accountmanagement.core.ports.out;

import java.time.Instant;

public interface UtcClock {
    Instant now();
}
