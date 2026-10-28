package de.justvotes.bootstrap;

import de.justvotes.accountmanagement.core.model.Account;
import de.justvotes.accountmanagement.core.model.InvitationPreview;
import de.justvotes.accountmanagement.core.ports.in.AcceptInvitation;
import de.justvotes.adapters.accountmanagement.infra.in.http.AccountResponseMapper;
import de.justvotes.adapters.shared.infra.in.http.SecurityEventLogger;
import de.justvotes.api.v1.model.CurrentSession;
import de.justvotes.api.v1.model.InvitationAcceptance;
import de.justvotes.api.v1.model.InvitationTokenRequest;
import de.justvotes.api.v1.server.InvitationsApi;
import de.justvotes.bootstrap.config.AccountSessions;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication.Type;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.net.URI;

/**
 * Lets an invited person complete their account without a session. Lives in bootstrap because a
 * successful acceptance signs the new account in.
 */
@RestController
@ConditionalOnWebApplication(type = Type.SERVLET)
class InvitationAcceptanceController implements InvitationsApi {
    private final AcceptInvitation invitations;
    private final AccountSessions sessions;
    private final SecurityEventLogger securityEvents;

    InvitationAcceptanceController(@Qualifier("invitationAcceptance") AcceptInvitation invitations,
                                   AccountSessions sessions, SecurityEventLogger securityEvents) {
        this.invitations = invitations;
        this.sessions = sessions;
        this.securityEvents = securityEvents;
    }

    private static boolean authenticated() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken);
    }

    @Override
    public ResponseEntity<de.justvotes.api.v1.model.InvitationPreview> inspectInvitation(InvitationTokenRequest request) {
        InvitationPreview preview = invitations.inspect(request.getToken());
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(new de.justvotes.api.v1.model.InvitationPreview(preview.email().value(),
                        AccountResponseMapper.utc(preview.expiresAt())));
    }

    @Override
    public ResponseEntity<CurrentSession> acceptInvitation(InvitationAcceptance acceptance) {
        if (authenticated()) {
            throw new AlreadyAuthenticatedException();
        }
        Account account = invitations.accept(acceptance.getToken(), acceptance.getUsername(), acceptance.getUserID(),
                acceptance.getPassword());
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.currentRequestAttributes();
        sessions.establish(account, attributes.getRequest(), attributes.getResponse());
        securityEvents.invitationAccepted(account.id().orElseThrow().value(), account.name().value());
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(AccountResponseMapper.session(account));
    }

    @ExceptionHandler(AlreadyAuthenticatedException.class)
    ResponseEntity<ProblemDetail> alreadyAuthenticated(AlreadyAuthenticatedException exception, HttpServletRequest request) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT,
                "Sign out before accepting an invitation.");
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setType(URI.create("https://justvotes.de/problems/already-authenticated"));
        problem.setProperty("code", "already-authenticated");
        return ResponseEntity.status(HttpStatus.CONFLICT).contentType(MediaType.APPLICATION_PROBLEM_JSON)
                .cacheControl(CacheControl.noStore()).body(problem);
    }

    static final class AlreadyAuthenticatedException extends RuntimeException {
        AlreadyAuthenticatedException() {
            super("Already authenticated.");
        }
    }
}
