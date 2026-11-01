package de.justvotes.bootstrap.config;

import de.justvotes.accountmanagement.core.model.EmailAddress;
import de.justvotes.accountmanagement.core.model.InvitationToken;
import de.justvotes.accountmanagement.core.ports.out.InvitationMailer;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Sends plain-text invitation emails. The token is placed in the link fragment so it never reaches
 * server or proxy access logs.
 */
final class SmtpInvitationMailer implements InvitationMailer {
    private static final DateTimeFormatter EXPIRY = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm 'UTC'")
            .withZone(ZoneOffset.UTC);
    private final JavaMailSender sender;
    private final String from;
    private final String publicBaseUrl;
    private final String applicationName;

    SmtpInvitationMailer(JavaMailSender sender, String from, String publicBaseUrl, String applicationName) {
        this.sender = sender;
        this.from = from;
        this.publicBaseUrl = stripTrailingSlash(publicBaseUrl);
        this.applicationName = applicationName;
    }

    private static String stripTrailingSlash(String url) {
        if (url.endsWith("/")) {
            return url.substring(0, url.length() - 1);
        }
        return url;
    }

    String link(InvitationToken token) {
        return publicBaseUrl + "/invitation#token=" + token.value();
    }

    @Override
    public boolean isAvailable() {
        return true;
    }

    @Override
    public void send(EmailAddress recipient, InvitationToken token, Instant expiresAt, Locale locale) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(recipient.value());
        String expiry = EXPIRY.format(expiresAt);
        if (Locale.ENGLISH.getLanguage().equals(locale.getLanguage())) {
            message.setSubject("Your invitation to " + applicationName);
            message.setText("Hello,\n\nyou have been invited to " + applicationName + ".\n"
                    + "Open the following link to choose your display name and password. You will sign in with this email address:\n\n"
                    + link(token) + "\n\nThe link can be used once and is valid until " + expiry + ".\n");
        } else {
            message.setSubject("Deine Einladung zu " + applicationName);
            message.setText("Hallo,\n\ndu wurdest zu " + applicationName + " eingeladen.\n"
                    + "Öffne den folgenden Link, um deinen Anzeigenamen und dein Passwort festzulegen. Anmelden wirst du dich mit dieser E-Mail-Adresse:\n\n"
                    + link(token) + "\n\nDer Link ist einmalig nutzbar und gültig bis " + expiry + ".\n");
        }
        sender.send(message);
    }
}
