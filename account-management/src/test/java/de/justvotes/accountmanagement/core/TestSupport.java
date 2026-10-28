package de.justvotes.accountmanagement.core;

import de.justvotes.accountmanagement.core.model.EmailAddress;
import de.justvotes.accountmanagement.core.model.InvitationToken;
import de.justvotes.accountmanagement.core.ports.out.InvitationMailer;
import de.justvotes.accountmanagement.core.ports.out.TokenGenerator;
import de.justvotes.accountmanagement.core.ports.out.UtcClock;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

final class TestSupport {
    private TestSupport() {
    }

    static final class MutableClock implements UtcClock {
        private Instant now = Instant.parse("2026-10-27T10:00:00Z");

        @Override
        public Instant now() {
            return now;
        }

        void advance(Duration duration) {
            now = now.plus(duration);
        }
    }

    static final class SequentialTokens implements TokenGenerator {
        private int counter;

        @Override
        public InvitationToken invitationToken() {
            counter++;
            return InvitationToken.of("token-" + counter);
        }

        @Override
        public String oneTimePassword() {
            counter++;
            return "one-time-pass-" + counter + "x";
        }
    }

    static final class RecordingMailer implements InvitationMailer {
        final List<String> sentTokens = new ArrayList<>();
        boolean available = true;

        @Override
        public boolean isAvailable() {
            return available;
        }

        @Override
        public void send(EmailAddress recipient, InvitationToken token, Instant expiresAt, Locale locale) {
            sentTokens.add(token.value());
        }
    }
}
