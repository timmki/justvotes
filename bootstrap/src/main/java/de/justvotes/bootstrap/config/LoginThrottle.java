package de.justvotes.bootstrap.config;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Slows down repeated failed logins per entered account name, whether or not the account exists.
 * After five consecutive failures a name is blocked for 30 seconds; every further failure doubles the
 * block up to 15 minutes. A successful login resets the name. Kept in memory because JustVotes runs as
 * a single instance.
 */
public final class LoginThrottle {
    static final int FREE_ATTEMPTS = 5;
    static final Duration FIRST_BLOCK = Duration.ofSeconds(30);
    static final Duration MAX_BLOCK = Duration.ofMinutes(15);

    private final Map<String, Attempts> attempts = new ConcurrentHashMap<>();
    private final Clock clock;

    public LoginThrottle(Clock clock) {
        this.clock = clock;
    }

    private static String key(String accountName) {
        if (accountName == null) {
            return "";
        }
        return accountName.toLowerCase(Locale.ROOT);
    }

    /**
     * Returns the remaining block time if the name is currently blocked.
     */
    public Optional<Duration> blockedFor(String accountName) {
        Attempts current = attempts.get(key(accountName));
        if (current == null || current.blockedUntil() == null) {
            return Optional.empty();
        }
        Duration remaining = Duration.between(clock.instant(), current.blockedUntil());
        if (remaining.isNegative() || remaining.isZero()) {
            return Optional.empty();
        }
        return Optional.of(remaining);
    }

    public void recordFailure(String accountName) {
        Instant now = clock.instant();
        attempts.compute(key(accountName), (ignored, previous) -> {
            int failures = 1;
            if (previous != null) {
                failures = previous.failures() + 1;
            }
            if (failures < FREE_ATTEMPTS) {
                return new Attempts(failures, null);
            }
            Duration block = FIRST_BLOCK.multipliedBy(1L << Math.min(failures - FREE_ATTEMPTS, 10));
            if (block.compareTo(MAX_BLOCK) > 0) {
                block = MAX_BLOCK;
            }
            return new Attempts(failures, now.plus(block));
        });
    }

    public void recordSuccess(String accountName) {
        attempts.remove(key(accountName));
    }

    private record Attempts(int failures, Instant blockedUntil) {
    }
}
