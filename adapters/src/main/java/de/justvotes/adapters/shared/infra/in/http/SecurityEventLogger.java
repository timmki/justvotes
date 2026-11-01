package de.justvotes.adapters.shared.infra.in.http;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.spi.LoggingEventBuilder;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Locale;

/**
 * Writes security-relevant account events as structured log entries. It never receives passwords,
 * tokens or password hashes, and identifies accounts only by their ID; entered email addresses of failed
 * logins are only logged as a short fingerprint so that a password typed into the email field cannot
 * reach the log.
 */
public final class SecurityEventLogger {
    private static final Logger LOG = LoggerFactory.getLogger("justvotes.security");
    private static final int FINGERPRINT_LENGTH = 12;

    static String fingerprint(String enteredEmail) {
        String normalized = "";
        if (enteredEmail != null) {
            normalized = enteredEmail.strip().toLowerCase(Locale.ROOT);
        }
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(normalized.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest).substring(0, FINGERPRINT_LENGTH);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available.", exception);
        }
    }

    private static void account(String event, long accountId) {
        LOG.atInfo()
                .addKeyValue("event", event)
                .addKeyValue("accountId", accountId)
                .log("Security event {}", event);
    }

    private static void enteredEmail(String event, String enteredEmail) {
        LoggingEventBuilder builder = LOG.atWarn().addKeyValue("event", event);
        builder.addKeyValue("emailFingerprint", fingerprint(enteredEmail)).log("Security event {}", event);
    }

    public void login(long accountId) {
        account("login", accountId);
    }

    /**
     * Failed logins never log the entered email address, whether or not an account with it exists.
     */
    public void loginFailed(String enteredEmail) {
        enteredEmail("login-failed", enteredEmail);
    }

    public void loginThrottled(String enteredEmail) {
        enteredEmail("login-throttled", enteredEmail);
    }

    public void logout(long accountId) {
        account("logout", accountId);
    }

    public void passwordChanged(long accountId) {
        account("password-changed", accountId);
    }

    /**
     * One event per confirmed contact import, with counters only and never names or addresses.
     */
    public void contactImport(long actorId, int invited, int renewed, int skipped, int deliveryFailed) {
        LOG.atInfo()
                .addKeyValue("event", "contact-import")
                .addKeyValue("actorId", actorId)
                .addKeyValue("invited", invited)
                .addKeyValue("renewed", renewed)
                .addKeyValue("skipped", skipped)
                .addKeyValue("deliveryFailed", deliveryFailed)
                .log("Security event contact-import");
    }

    public void invitationIssued(long invitationId, long actorId) {
        invitation("invitation-issued", invitationId, actorId);
    }

    public void invitationResent(long invitationId, long actorId) {
        invitation("invitation-resent", invitationId, actorId);
    }

    public void invitationRevoked(long invitationId, long actorId) {
        invitation("invitation-revoked", invitationId, actorId);
    }

    public void invitationAccepted(long accountId) {
        account("invitation-accepted", accountId);
    }

    public void accountLocked(long accountId, long actorId) {
        administration("account-locked", accountId, actorId);
    }

    public void accountUnlocked(long accountId, long actorId) {
        administration("account-unlocked", accountId, actorId);
    }

    public void oneTimePasswordSet(long accountId, long actorId) {
        administration("one-time-password-set", accountId, actorId);
    }

    public void adminPasswordReset() {
        LOG.atWarn()
                .addKeyValue("event", "admin-password-reset")
                .log("Security event admin-password-reset");
    }

    private static void invitation(String event, long invitationId, long actorId) {
        LOG.atInfo()
                .addKeyValue("event", event)
                .addKeyValue("invitationId", invitationId)
                .addKeyValue("actorId", actorId)
                .log("Security event {}", event);
    }

    private static void administration(String event, long accountId, long actorId) {
        LOG.atInfo()
                .addKeyValue("event", event)
                .addKeyValue("accountId", accountId)
                .addKeyValue("actorId", actorId)
                .log("Security event {}", event);
    }
}
