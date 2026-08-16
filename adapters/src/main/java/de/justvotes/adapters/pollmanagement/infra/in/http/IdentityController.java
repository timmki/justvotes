package de.justvotes.adapters.pollmanagement.infra.in.http;

import de.justvotes.pollmanagement.core.model.Identity;
import de.justvotes.pollmanagement.core.ports.in.ManageVotes;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/identity")
public final class IdentityController {
    private static final String COOKIE = "userID";
    private final ManageVotes votes;

    public IdentityController(ManageVotes votes) {
        this.votes = votes;
    }

    @PostMapping
    public ResponseEntity<Void> change(@RequestBody IdentityRequest request, HttpServletRequest servletRequest) {
        Identity identity = Identity.of(request.userID());
        votes.changeIdentity(cookieIdentity(servletRequest), identity);
        return ResponseEntity.noContent().header("Set-Cookie", ResponseCookie.from(COOKIE, identity.value()).path("/").maxAge(java.time.Duration.ofDays(3650)).sameSite("Lax").build().toString()).build();
    }

    private Identity cookieIdentity(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        for (var cookie : request.getCookies())
            if (COOKIE.equals(cookie.getName())) return Identity.of(cookie.getValue());
        return null;
    }

    public record IdentityRequest(String userID) {
    }
}
