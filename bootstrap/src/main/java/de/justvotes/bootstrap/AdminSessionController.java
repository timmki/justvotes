package de.justvotes.bootstrap;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
class AdminSessionController {
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;
    private final SecurityContextLogoutHandler logoutHandler = new SecurityContextLogoutHandler();

    AdminSessionController(AuthenticationManager authenticationManager, SecurityContextRepository securityContextRepository) {
        this.authenticationManager = authenticationManager;
        this.securityContextRepository = securityContextRepository;
    }

    @GetMapping("/api/v1/csrf")
    CsrfTokenResponse csrf(CsrfToken token) {
        return new CsrfTokenResponse(token.getToken(), token.getHeaderName());
    }

    @PostMapping("/api/v1/admin/login")
    ResponseEntity<Void> login(@RequestBody LoginRequest login, HttpServletRequest request, HttpServletResponse response) {
        var authentication = authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(login.username(), login.password()));
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        securityContextRepository.saveContext(context, request, response);
        SecurityContextHolder.setContext(context);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/api/v1/admin/logout")
    ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response) {
        logoutHandler.logout(request, response, SecurityContextHolder.getContext().getAuthentication());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/v1/admin/session")
    ResponseEntity<Void> session() {
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(BadCredentialsException.class)
    ResponseEntity<ProblemDetail> invalidCredentials(BadCredentialsException exception, HttpServletRequest request) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, "Invalid administrator credentials.");
        problem.setInstance(java.net.URI.create(request.getRequestURI()));
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(problem);
    }

    record LoginRequest(String username, String password) {
    }

    record CsrfTokenResponse(String token, String headerName) {
    }
}
