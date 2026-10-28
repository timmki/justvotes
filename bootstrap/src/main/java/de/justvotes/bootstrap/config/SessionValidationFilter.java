package de.justvotes.bootstrap.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import de.justvotes.accountmanagement.core.model.Account;
import de.justvotes.accountmanagement.core.model.AccountId;
import de.justvotes.accountmanagement.core.model.AccountStatus;
import de.justvotes.accountmanagement.core.ports.in.ViewAccounts;
import de.justvotes.adapters.accountmanagement.infra.in.http.AccountResponseMapper;
import de.justvotes.adapters.shared.infra.in.http.AuthenticatedAccount;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

/**
 * Re-validates every authenticated session against the stored account. Sessions of missing or locked
 * accounts, sessions whose epoch is outdated (password changed, one-time password set, account locked)
 * and sessions older than the absolute lifetime are invalidated before authorization runs. Valid
 * sessions expose the account as {@link AuthenticatedAccount} request attribute.
 */
public final class SessionValidationFilter extends OncePerRequestFilter {
    private final ViewAccounts accounts;
    private final Clock clock;
    private final Duration maxLifetime;
    private final ObjectMapper objectMapper;

    public SessionValidationFilter(ViewAccounts accounts, Clock clock, Duration maxLifetime, ObjectMapper objectMapper) {
        this.accounts = accounts;
        this.clock = clock;
        this.maxLifetime = maxLifetime;
        this.objectMapper = objectMapper;
    }

    private static boolean passwordChangeAllowed(HttpServletRequest request) {
        String path = request.getRequestURI();
        return !path.startsWith("/api/") || path.equals("/api/v1/csrf") || path.startsWith("/api/v1/session");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        HttpSession session = request.getSession(false);
        if (session == null || !(session.getAttribute(AccountSessions.ACCOUNT_ID) instanceof Long accountId)) {
            chain.doFilter(request, response);
            return;
        }
        Optional<Account> account = valid(session, accountId);
        if (account.isEmpty()) {
            session.invalidate();
            SecurityContextHolder.clearContext();
            chain.doFilter(request, response);
            return;
        }
        Account current = account.get();
        request.setAttribute(AuthenticatedAccount.REQUEST_ATTRIBUTE, AccountResponseMapper.authenticated(current));
        if (current.passwordChangeRequired() && !passwordChangeAllowed(request)) {
            SecurityConfiguration.writeProblemDetail(request, response, objectMapper, HttpStatus.FORBIDDEN,
                    "password-change-required", "A new password must be set first.");
            return;
        }
        chain.doFilter(request, response);
    }

    private Optional<Account> valid(HttpSession session, long accountId) {
        Object loginAt = session.getAttribute(AccountSessions.LOGIN_AT);
        Object epoch = session.getAttribute(AccountSessions.SESSION_EPOCH);
        if (!(loginAt instanceof Long loginMillis) || !(epoch instanceof Integer sessionEpoch)) {
            return Optional.empty();
        }
        if (Instant.ofEpochMilli(loginMillis).plus(maxLifetime).isBefore(clock.instant())) {
            return Optional.empty();
        }
        return accounts.account(AccountId.of(accountId))
                .filter(account -> account.status() == AccountStatus.ACTIVE)
                .filter(account -> account.sessionEpoch() == sessionEpoch);
    }
}
