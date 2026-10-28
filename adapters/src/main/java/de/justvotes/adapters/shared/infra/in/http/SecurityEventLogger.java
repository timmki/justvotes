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
 * tokens or password hashes; names of unknown accounts are only logged as a short fingerprint so that
 * a password typed into the name field cannot reach the log.
 */
public final class SecurityEventLogger {
    private static final Logger LOG = LoggerFactory.getLogger("justvotes.security");
    private static final int FINGERPRINT_LENGTH = 12;

    static String fingerprint(String accountName) {
        String normalized = "";
        if (accountName != null) {
            normalized = accountName.toLowerCase(Locale.ROOT);
        }
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(normalized.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest).substring(0, FINGERPRINT_LENGTH);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available.", exception);
        }
    }

    private static void account(String event, long accountId, String accountName) {
        LOG.atInfo()
                .addKeyValue("event", event)
                .addKeyValue("accountId", accountId)
                .addKeyValue("accountName", accountName)
                .log("Security event {}", event);
    }

    private static void enteredName(String event, String enteredName) {
        LoggingEventBuilder builder = LOG.atWarn().addKeyValue("event", event);
        builder.addKeyValue("nameFingerprint", fingerprint(enteredName)).log("Security event {}", event);
    }

    public void login(long accountId, String accountName) {
        account("login", accountId, accountName);
    }

    /**
     * Failed logins never log the entered name, whether or not an account with that name exists.
     */
    public void loginFailed(String enteredName) {
        enteredName("login-failed", enteredName);
    }

    public void loginThrottled(String enteredName) {
        enteredName("login-throttled", enteredName);
    }

    public void logout(long accountId, String accountName) {
        account("logout", accountId, accountName);
    }

    public void passwordChanged(long accountId, String accountName) {
        account("password-changed", accountId, accountName);
    }

    public void invitationIssued(long invitationId, long actorId, String actorName) {
        invitation("invitation-issued", invitationId, actorId, actorName);
    }

    public void invitationResent(long invitationId, long actorId, String actorName) {
        invitation("invitation-resent", invitationId, actorId, actorName);
    }

    public void invitationRevoked(long invitationId, long actorId, String actorName) {
        invitation("invitation-revoked", invitationId, actorId, actorName);
    }

    public void invitationAccepted(long accountId, String accountName) {
        account("invitation-accepted", accountId, accountName);
    }

    public void accountLocked(long accountId, String accountName, String actorName) {
        administration("account-locked", accountId, accountName, actorName);
    }

    public void accountUnlocked(long accountId, String accountName, String actorName) {
        administration("account-unlocked", accountId, accountName, actorName);
    }

    public void oneTimePasswordSet(long accountId, String accountName, String actorName) {
        administration("one-time-password-set", accountId, accountName, actorName);
    }

    public void adminPasswordReset(String accountName) {
        LOG.atWarn()
                .addKeyValue("event", "admin-password-reset")
                .addKeyValue("accountName", accountName)
                .log("Security event admin-password-reset");
    }

    private static void invitation(String event, long invitationId, long actorId, String actorName) {
        LOG.atInfo()
                .addKeyValue("event", event)
                .addKeyValue("invitationId", invitationId)
                .addKeyValue("accountId", actorId)
                .addKeyValue("accountName", actorName)
                .log("Security event {}", event);
    }

    private static void administration(String event, long accountId, String accountName, String actorName) {
        LOG.atInfo()
                .addKeyValue("event", event)
                .addKeyValue("accountId", accountId)
                .addKeyValue("accountName", accountName)
                .addKeyValue("actorName", actorName)
                .log("Security event {}", event);
    }
}
