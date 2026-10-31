package de.justvotes.bootstrap.config;

import de.justvotes.accountmanagement.core.model.Account;
import de.justvotes.accountmanagement.core.model.AccountIdentity;
import de.justvotes.accountmanagement.core.model.Role;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;

import java.time.Clock;
import java.util.List;

/**
 * Creates the server-side session of a signed-in account. The session stores the account ID, the
 * account's session epoch and the login time so {@link SessionValidationFilter} can end it when the
 * password changes, the account is locked or the absolute lifetime is exceeded.
 */
public final class AccountSessions {
    static final String ADMIN_PRINCIPAL = "admin";
    public static final String ACCOUNT_ID = "justvotes.accountId";
    public static final String SESSION_EPOCH = "justvotes.sessionEpoch";
    public static final String LOGIN_AT = "justvotes.loginAt";
    private static final String LEGACY_IDENTITY_COOKIE = "userID";

    private final SecurityContextRepository contexts;
    private final Clock clock;

    public AccountSessions(SecurityContextRepository contexts, Clock clock) {
        this.contexts = contexts;
        this.clock = clock;
    }

    public static String authority(Role role) {
        return "ROLE_" + role.name();
    }

    /**
     * The principal name ends up as poll creator and audit actor, so it must stay stable and must not reveal
     * an email address: the single administrator is always "admin", users appear under their identity.
     */
    static String principalName(Account account) {
        return account.identity().map(AccountIdentity::value).orElse(ADMIN_PRINCIPAL);
    }

    public void establish(Account account, HttpServletRequest request, HttpServletResponse response) {
        HttpSession previous = request.getSession(false);
        if (previous != null) {
            previous.invalidate();
        }
        HttpSession session = request.getSession(true);
        session.setAttribute(ACCOUNT_ID, account.id().orElseThrow().value());
        session.setAttribute(SESSION_EPOCH, account.sessionEpoch());
        session.setAttribute(LOGIN_AT, clock.instant().toEpochMilli());

        UsernamePasswordAuthenticationToken authentication = UsernamePasswordAuthenticationToken.authenticated(
                principalName(account), null, List.of(new SimpleGrantedAuthority(authority(account.role()))));
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        contexts.saveContext(context, request, response);

        response.addHeader(HttpHeaders.SET_COOKIE, ResponseCookie.from(LEGACY_IDENTITY_COOKIE, "")
                .path("/").maxAge(0).httpOnly(true).sameSite("Lax").secure(request.isSecure()).build().toString());
    }

    public void updateEpoch(Account account, HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.setAttribute(SESSION_EPOCH, account.sessionEpoch());
        }
    }
}
