package de.justvotes.adapters.pollmanagement.infra.in.scheduling;

import de.justvotes.pollmanagement.core.ports.in.ManagePolls;
import org.springframework.scheduling.annotation.Scheduled;

import java.time.Instant;

public final class PollExpiryScheduler {
    private final ManagePolls polls;

    public PollExpiryScheduler(ManagePolls polls) {
        this.polls = polls;
    }

    @Scheduled(fixedDelayString = "${justvotes.poll-expiry-check-delay:60000}")
    public void expireDuePolls() {
        polls.expireDuePolls(Instant.now());
    }
}
