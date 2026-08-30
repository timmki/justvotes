package de.justvotes.adapters.pollmanagement.infra.in.http;

import de.justvotes.api.v1.server.IdentityApi;
import de.justvotes.pollmanagement.core.model.Identity;
import de.justvotes.pollmanagement.core.ports.in.ManageVotes;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.Duration;

@RestController
public class IdentityController implements IdentityApi {
    private static final String COOKIE = "userID";
    private final ManageVotes votes;

    public IdentityController(ManageVotes votes) {
        this.votes = votes;
    }

    @Override
    public ResponseEntity<Void> changeIdentity(de.justvotes.api.v1.model.Identity request) {
        HttpServletRequest servletRequest = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();
        Identity identity = Identity.of(request.getUserID());
        votes.changeIdentity(cookieIdentity(servletRequest), identity);
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore())
                .header("Set-Cookie", ResponseCookie.from(COOKIE, identity.value())
                .path("/")
                .maxAge(Duration.ofDays(3650))
                .sameSite("Lax")
                .httpOnly(true)
                .secure(servletRequest.isSecure())
                .build().toString()).build();
    }

    private Identity cookieIdentity(HttpServletRequest request) {
        if (request.getCookies() == null) {
            return null;
        }
        for (var cookie : request.getCookies())
            if (COOKIE.equals(cookie.getName())) {
                return Identity.of(cookie.getValue());
            }
        return null;
    }

}
