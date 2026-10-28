package de.justvotes.adapters.shared.infra.in.http;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Gives controllers access to the signed-in account without depending on the security framework.
 */
public final class AuthenticatedAccounts {
    private AuthenticatedAccounts() {
    }

    public static AuthenticatedAccount current() {
        HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();
        return current(request);
    }

    public static AuthenticatedAccount current(HttpServletRequest request) {
        Object account = request.getAttribute(AuthenticatedAccount.REQUEST_ATTRIBUTE);
        if (account instanceof AuthenticatedAccount authenticated) {
            return authenticated;
        }
        throw new IllegalStateException("The request has no authenticated account.");
    }
}
