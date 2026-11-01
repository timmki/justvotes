package de.justvotes.bootstrap;

import de.justvotes.accountmanagement.core.exception.InvalidCredentialsException;
import de.justvotes.accountmanagement.core.model.Account;
import de.justvotes.accountmanagement.core.model.AccountId;
import de.justvotes.accountmanagement.core.ports.in.Authenticate;
import de.justvotes.accountmanagement.core.ports.in.ManageOwnCredentials;
import de.justvotes.accountmanagement.core.ports.in.ViewAccounts;
import de.justvotes.adapters.accountmanagement.infra.in.http.AccountResponseMapper;
import de.justvotes.adapters.shared.infra.in.http.AuthenticatedAccount;
import de.justvotes.adapters.shared.infra.in.http.AuthenticatedAccounts;
import de.justvotes.adapters.shared.infra.in.http.SecurityEventLogger;
import de.justvotes.api.v1.model.CsrfToken;
import de.justvotes.api.v1.model.CurrentSession;
import de.justvotes.api.v1.model.Login;
import de.justvotes.api.v1.model.PasswordChange;
import de.justvotes.api.v1.server.SessionApi;
import de.justvotes.bootstrap.config.AccountSessions;
import de.justvotes.bootstrap.config.LoginThrottle;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication.Type;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.net.URI;
import java.time.Duration;

@RestController
@ConditionalOnWebApplication(type = Type.SERVLET)
class SessionController implements SessionApi {
    private final Authenticate authentication;
    private final ViewAccounts accounts;
    private final ManageOwnCredentials credentials;
    private final AccountSessions sessions;
    private final LoginThrottle throttle;
    private final SecurityEventLogger securityEvents;
    private final SecurityContextLogoutHandler logoutHandler = new SecurityContextLogoutHandler();

    SessionController(@Qualifier("authentication") Authenticate authentication,
                      @Qualifier("accountQueries") ViewAccounts accounts,
                      @Qualifier("ownCredentials") ManageOwnCredentials credentials,
                      AccountSessions sessions, LoginThrottle throttle, SecurityEventLogger securityEvents) {
        this.authentication = authentication;
        this.accounts = accounts;
        this.credentials = credentials;
        this.sessions = sessions;
        this.throttle = throttle;
        this.securityEvents = securityEvents;
    }

    private static ServletRequestAttributes attributes() {
        return (ServletRequestAttributes) RequestContextHolder.currentRequestAttributes();
    }

    @Override
    public ResponseEntity<CsrfToken> csrf() {
        org.springframework.security.web.csrf.CsrfToken token = (org.springframework.security.web.csrf.CsrfToken) attributes().getRequest()
                .getAttribute(org.springframework.security.web.csrf.CsrfToken.class.getName());
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(new CsrfToken(token.getToken(), token.getHeaderName()));
    }

    @Override
    public ResponseEntity<CurrentSession> login(Login login) {
        String email = login.getEmail();
        if (throttle.blockedFor(email).isPresent()) {
            securityEvents.loginThrottled(email);
            throw new LoginThrottledException(throttle.blockedFor(email).get());
        }
        Account account;
        try {
            account = authentication.authenticate(email, login.getPassword());
        } catch (InvalidCredentialsException exception) {
            throttle.recordFailure(email);
            securityEvents.loginFailed(email);
            throw exception;
        }
        throttle.recordSuccess(email);
        sessions.establish(account, attributes().getRequest(), attributes().getResponse());
        securityEvents.login(account.id().orElseThrow().value());
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(AccountResponseMapper.session(account));
    }

    @Override
    public ResponseEntity<CurrentSession> currentSession() {
        Account account = accounts.account(AccountId.of(AuthenticatedAccounts.current().accountId())).orElseThrow();
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(AccountResponseMapper.session(account));
    }

    @Override
    public ResponseEntity<Void> logout() {
        HttpServletRequest request = attributes().getRequest();
        HttpServletResponse response = attributes().getResponse();
        AuthenticatedAccount account = AuthenticatedAccounts.current(request);
        logoutHandler.logout(request, response, SecurityContextHolder.getContext().getAuthentication());
        securityEvents.logout(account.accountId());
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }

    @Override
    public ResponseEntity<Void> changePassword(PasswordChange passwordChange) {
        HttpServletRequest request = attributes().getRequest();
        AuthenticatedAccount current = AuthenticatedAccounts.current(request);
        Account account = credentials.changePassword(AccountId.of(current.accountId()), passwordChange.getCurrentPassword(),
                passwordChange.getNewPassword());
        sessions.updateEpoch(account, request);
        securityEvents.passwordChanged(current.accountId());
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }

    @ExceptionHandler(LoginThrottledException.class)
    ResponseEntity<ProblemDetail> loginThrottled(LoginThrottledException exception, HttpServletRequest request) {
        long seconds = Math.max(1, (exception.retryAfter().toMillis() + 999) / 1000);
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.TOO_MANY_REQUESTS,
                "Too many failed logins. Try again later.");
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setType(URI.create("https://justvotes.de/problems/login-throttled"));
        problem.setProperty("code", "login-throttled");
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .contentType(MediaType.APPLICATION_PROBLEM_JSON)
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.RETRY_AFTER, String.valueOf(seconds))
                .body(problem);
    }

    static final class LoginThrottledException extends RuntimeException {
        private final Duration retryAfter;

        LoginThrottledException(Duration retryAfter) {
            super("Login throttled.");
            this.retryAfter = retryAfter;
        }

        Duration retryAfter() {
            return retryAfter;
        }
    }
}
