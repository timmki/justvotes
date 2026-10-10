package de.justvotes.adapters.pollmanagement.infra.in.http;

import de.justvotes.adapters.shared.infra.in.http.OpaqueIdCodec;
import de.justvotes.api.v1.model.CurrentIdentity;
import de.justvotes.api.v1.model.CurrentIdentityVotes;
import de.justvotes.api.v1.model.Option;
import de.justvotes.api.v1.model.PersonalVote;
import de.justvotes.api.v1.model.PersonalVotePoll;
import de.justvotes.api.v1.model.PersonalVotePoll.StateEnum;
import de.justvotes.api.v1.server.IdentityApi;
import de.justvotes.pollmanagement.core.model.Identity;
import de.justvotes.pollmanagement.core.ports.in.ManageVotes;
import de.justvotes.pollmanagement.core.ports.in.ViewVotes;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;

@RestController
public class IdentityController implements IdentityApi {
    private final ManageVotes votes;

    private final ViewVotes queries;

    public IdentityController(ManageVotes votes, ViewVotes queries) {
        this.votes = votes;
        this.queries = queries;
    }

    @Override
    public ResponseEntity<CurrentIdentityVotes> currentIdentityVotes() {
        HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();
        Identity identity = safeCookieIdentity(request);
        String userId = null;
        List<PersonalVote> entries = List.of();
        if (identity != null) {
            userId = identity.value();
            entries = queries.currentVotes(identity).stream().map(vote -> new PersonalVote(
                    new PersonalVotePoll(OpaqueIdCodec.encode("p", vote.pollId().value()), vote.pollTitle(),
                            StateEnum.fromValue(vote.pollState().name().toLowerCase(Locale.ROOT))),
                    new Option(vote.optionNumber(), vote.optionText()),
                    OffsetDateTime.ofInstant(vote.votedAt(), ZoneOffset.UTC))).toList();
        }
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(new CurrentIdentityVotes(userId, entries));
    }

    @Override
    public ResponseEntity<CurrentIdentity> currentIdentity() {
        HttpServletRequest servletRequest = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();
        Identity identity = safeCookieIdentity(servletRequest);
        String userId = null;
        if (identity != null) {
            userId = identity.value();
        }
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(new CurrentIdentity(userId));
    }

    @Override
    public ResponseEntity<Void> changeIdentity(de.justvotes.api.v1.model.Identity request) {
        HttpServletRequest servletRequest = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();
        Identity identity = Identity.of(request.getUserID());
        votes.changeIdentity(cookieIdentity(servletRequest), identity);
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore())
                .header("Set-Cookie", ResponseCookie.from(IdentityCookieCodec.NAME, IdentityCookieCodec.encode(identity))
                        .path("/")
                        .maxAge(Duration.ofDays(3650))
                        .sameSite("Lax")
                        .httpOnly(true)
                        .secure(servletRequest.isSecure())
                        .build().toString()).build();
    }

    private Identity cookieIdentity(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        for (Cookie cookie : request.getCookies()) if (IdentityCookieCodec.NAME.equals(cookie.getName())) return IdentityCookieCodec.decode(cookie.getValue());
        return null;
    }

    private Identity safeCookieIdentity(HttpServletRequest request) {
        try {
            return cookieIdentity(request);
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

}
