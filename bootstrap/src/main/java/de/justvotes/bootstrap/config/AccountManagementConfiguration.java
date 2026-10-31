package de.justvotes.bootstrap.config;

import de.justvotes.accountmanagement.core.AccountManagement;
import de.justvotes.accountmanagement.core.InvitationManagement;
import de.justvotes.accountmanagement.core.model.AdminProvisioning;
import de.justvotes.accountmanagement.core.model.EmailAddress;
import de.justvotes.accountmanagement.core.ports.in.AcceptInvitation;
import de.justvotes.accountmanagement.core.ports.in.Authenticate;
import de.justvotes.accountmanagement.core.ports.in.ManageAccounts;
import de.justvotes.accountmanagement.core.ports.in.ManageInvitations;
import de.justvotes.accountmanagement.core.ports.in.ManageOwnCredentials;
import de.justvotes.accountmanagement.core.ports.in.ProvisionAdmin;
import de.justvotes.accountmanagement.core.ports.in.ViewAccounts;
import de.justvotes.accountmanagement.core.ports.out.AccountRepository;
import de.justvotes.accountmanagement.core.ports.out.InvitationMailer;
import de.justvotes.accountmanagement.core.ports.out.InvitationRepository;
import de.justvotes.accountmanagement.core.ports.out.PasswordHasher;
import de.justvotes.accountmanagement.core.ports.out.TokenGenerator;
import de.justvotes.accountmanagement.core.ports.out.UtcClock;
import de.justvotes.adapters.accountmanagement.infra.in.http.AdminAccountController;
import de.justvotes.adapters.accountmanagement.infra.in.http.AdminInvitationController;
import de.justvotes.adapters.accountmanagement.infra.in.transaction.InvitationDelivery;
import de.justvotes.adapters.accountmanagement.infra.in.transaction.TransactionalAccountManagement;
import de.justvotes.adapters.accountmanagement.infra.in.transaction.TransactionalInvitationManagement;
import de.justvotes.adapters.accountmanagement.infra.out.persistence.JpaAccountPersistenceAdapter;
import de.justvotes.adapters.accountmanagement.infra.out.persistence.JpaInvitationPersistenceAdapter;
import de.justvotes.adapters.accountmanagement.infra.out.persistence.SpringDataAccountRepository;
import de.justvotes.adapters.accountmanagement.infra.out.persistence.SpringDataInvitationRepository;
import de.justvotes.adapters.accountmanagement.infra.out.security.SecureRandomTokenGenerator;
import de.justvotes.adapters.shared.infra.in.http.SecurityEventLogger;
import de.justvotes.adapters.sqlite.SqliteRetryingTransaction;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.security.crypto.bcrypt.BCrypt;

import java.time.Clock;
import java.util.Properties;

@Configuration
class AccountManagementConfiguration {
    static void validateAdminConfiguration(String email, String passwordHash) {
        try {
            EmailAddress.of(email);
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException("ADMIN_EMAIL must be a valid email address.", exception);
        }
        try {
            BCrypt.checkpw("configuration-validation", passwordHash);
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException("ADMIN_PASSWORD_HASH must be a BCrypt hash.", exception);
        }
    }

    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }

    @Bean
    UtcClock accountClock(Clock clock) {
        return clock::instant;
    }

    @Bean
    AccountRepository accountRepository(SpringDataAccountRepository accounts) {
        return new JpaAccountPersistenceAdapter(accounts);
    }

    @Bean
    InvitationRepository invitationRepository(SpringDataInvitationRepository invitations) {
        return new JpaInvitationPersistenceAdapter(invitations);
    }

    @Bean
    PasswordHasher passwordHasher() {
        return new SpringPasswordHasher();
    }

    @Bean
    TokenGenerator tokenGenerator() {
        return new SecureRandomTokenGenerator();
    }

    /**
     * Sends invitations only when both a mail host and the public application address are configured.
     * Spring Boot's own mail auto-configuration is not used, so an unconfigured or unreachable mail
     * server never affects the health endpoints.
     */
    @Bean
    InvitationMailer invitationMailer(Environment environment,
                                      @Value("${justvotes.mail.host:}") String host,
                                      @Value("${justvotes.mail.from:}") String from,
                                      @Value("${justvotes.public-base-url:}") String publicBaseUrl,
                                      @Value("${VITE_APP_NAME:JustVotes}") String applicationName) {
        if (host.isBlank() || publicBaseUrl.isBlank()) {
            return new UnavailableInvitationMailer();
        }
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(host);
        sender.setPort(environment.getProperty("justvotes.mail.port", Integer.class, 587));
        String username = environment.getProperty("justvotes.mail.username", "");
        if (!username.isBlank()) {
            sender.setUsername(username);
            sender.setPassword(environment.getProperty("justvotes.mail.password", ""));
        }
        Properties properties = sender.getJavaMailProperties();
        properties.put("mail.smtp.auth", String.valueOf(!username.isBlank()));
        properties.put("mail.smtp.starttls.enable", environment.getProperty("justvotes.mail.starttls", "true"));
        properties.put("mail.smtp.connectiontimeout", "5000");
        properties.put("mail.smtp.timeout", "10000");
        properties.put("mail.smtp.writetimeout", "10000");
        String senderAddress = from;
        if (senderAddress.isBlank()) {
            senderAddress = "justvotes@" + host;
        }
        return new SmtpInvitationMailer(sender, senderAddress, publicBaseUrl, applicationName);
    }

    /**
     * The domain services are not beans themselves so that every port is only reachable through its
     * transactional adapter.
     */
    @Bean
    TransactionalAccountManagement transactionalAccountManagement(AccountRepository accounts, PasswordHasher hasher,
                                                                  TokenGenerator tokens, UtcClock accountClock,
                                                                  SqliteRetryingTransaction transactions) {
        return new TransactionalAccountManagement(new AccountManagement(accounts, hasher, tokens, accountClock), transactions);
    }

    @Bean
    Authenticate authentication(TransactionalAccountManagement accounts) {
        return accounts;
    }

    @Bean
    ViewAccounts accountQueries(TransactionalAccountManagement accounts) {
        return accounts;
    }

    @Bean
    ManageOwnCredentials ownCredentials(TransactionalAccountManagement accounts) {
        return accounts;
    }

    @Bean
    ManageAccounts accountCommands(TransactionalAccountManagement accounts) {
        return accounts;
    }

    @Bean
    TransactionalInvitationManagement transactionalInvitationManagement(InvitationRepository invitations,
                                                                        AccountRepository accounts, PasswordHasher hasher,
                                                                        TokenGenerator tokens, InvitationMailer mailer,
                                                                        UtcClock accountClock,
                                                                        SqliteRetryingTransaction transactions) {
        return new TransactionalInvitationManagement(
                new InvitationManagement(invitations, accounts, hasher, tokens, mailer, accountClock), transactions);
    }

    @Bean
    InvitationDelivery invitationDelivery(TransactionalInvitationManagement invitations, InvitationMailer mailer) {
        return new InvitationDelivery(invitations, mailer);
    }

    @Bean
    LoginThrottle loginThrottle(Clock clock) {
        return new LoginThrottle(clock);
    }

    @Bean
    SecurityEventLogger securityEventLogger() {
        return new SecurityEventLogger();
    }

    @Bean
    AdminAccountController adminAccountController(@Qualifier("accountCommands") ManageAccounts commands,
                                                  @Qualifier("accountQueries") ViewAccounts queries,
                                                  SecurityEventLogger securityEvents) {
        return new AdminAccountController(commands, queries, securityEvents);
    }

    @Bean
    AdminInvitationController adminInvitationController(TransactionalInvitationManagement invitations,
                                                        InvitationDelivery delivery, SecurityEventLogger securityEvents) {
        return new AdminInvitationController(invitations, delivery, securityEvents);
    }

    @Bean
    AcceptInvitation invitationAcceptance(TransactionalInvitationManagement invitations) {
        return invitations;
    }

    @Bean
    ManageInvitations invitationCommands(TransactionalInvitationManagement invitations) {
        return invitations;
    }

    /**
     * Creates the single administrator account from the installation configuration on first start and
     * follows a changed {@code ADMIN_EMAIL}. An existing administrator keeps a password changed in the application unless
     * {@code ADMIN_PASSWORD_RESET=true} explicitly re-applies the configured hash.
     */
    @Bean
    @Order(0)
    ApplicationRunner administratorProvisioning(TransactionalAccountManagement accounts,
                                                SecurityEventLogger securityEvents,
                                                @Value("${ADMIN_EMAIL:}") String email,
                                                @Value("${ADMIN_PASSWORD_HASH}") String passwordHash,
                                                @Value("${justvotes.admin.password-reset:false}") boolean reset) {
        validateAdminConfiguration(email, passwordHash);
        ProvisionAdmin provisioning = accounts;
        return arguments -> {
            AdminProvisioning result = provisioning.provisionAdmin(email.strip(), SpringPasswordHasher.bcrypt(passwordHash), reset);
            if (result == AdminProvisioning.PASSWORD_RESET) {
                securityEvents.adminPasswordReset();
            }
        };
    }
}
