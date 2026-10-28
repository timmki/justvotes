package de.justvotes.bootstrap.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import de.justvotes.accountmanagement.core.model.Role;
import de.justvotes.accountmanagement.core.ports.in.ViewAccounts;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication.Type;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRepository;

import java.io.IOException;
import java.net.URI;
import java.time.Clock;
import java.time.Duration;

@Configuration
@ConditionalOnWebApplication(type = Type.SERVLET)
class SecurityConfiguration {
    static void writeProblemDetail(HttpServletRequest request, HttpServletResponse response, ObjectMapper objectMapper,
                                   HttpStatus status, String code, String detail) throws IOException {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setType(URI.create("https://justvotes.de/problems/" + code));
        problem.setProperty("code", code);
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        response.setHeader("Cache-Control", "no-store");
        objectMapper.writeValue(response.getOutputStream(), problem);
    }

    /**
     * Every API requires a signed-in account except the CSRF bootstrap, the login and the invitation
     * endpoints. Anything under {@code /api/v1} that is not listed is denied.
     */
    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, CsrfTokenRepository csrfTokenRepository,
                                            SecurityContextRepository securityContextRepository,
                                            AccessDeniedHandler problemDetailsAccessDeniedHandler,
                                            @Qualifier("accountQueries") ViewAccounts accounts, Clock clock,
                                            @Value("${justvotes.session.max-lifetime:PT12H}") Duration maxLifetime,
                                            ObjectMapper objectMapper) throws Exception {
        // Not a bean on purpose: as a bean the servlet container would also run it outside the security chain.
        SessionValidationFilter sessionValidationFilter = new SessionValidationFilter(accounts, clock, maxLifetime, objectMapper);
        String user = Role.USER.name();
        String admin = Role.ADMIN.name();
        return http
                .csrf(csrf -> csrf.csrfTokenRepository(csrfTokenRepository))
                .securityContext(context -> context.securityContextRepository(securityContextRepository))
                .addFilterBefore(sessionValidationFilter, AuthorizationFilter.class)
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers(HttpMethod.GET, "/api/v1/csrf").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/session/login").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/invitations/inspection", "/api/v1/invitations/acceptance").permitAll()
                        .requestMatchers("/api/v1/session", "/api/v1/session/**").authenticated()
                        .requestMatchers("/api/v1/polls", "/api/v1/polls/**", "/api/v1/identity/**").hasRole(user)
                        .requestMatchers("/api/v1/admin/**").hasRole(admin)
                        .requestMatchers("/api-docs/**", "/swagger-ui/**").hasRole(admin)
                        .requestMatchers("/api/**").denyAll()
                        .anyRequest().permitAll())
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, exception) -> writeProblemDetail(request, response,
                                objectMapper, HttpStatus.UNAUTHORIZED, "authentication-required", "Authentication is required."))
                        .accessDeniedHandler(problemDetailsAccessDeniedHandler))
                .build();
    }

    @Bean
    CsrfTokenRepository csrfTokenRepository() {
        CookieCsrfTokenRepository repository = CookieCsrfTokenRepository.withHttpOnlyFalse();
        repository.setCookiePath("/");
        repository.setCookieCustomizer(builder -> builder.sameSite("Lax"));
        return repository;
    }

    @Bean
    SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    AccessDeniedHandler problemDetailsAccessDeniedHandler(ObjectMapper objectMapper) {
        return (request, response, exception) -> writeProblemDetail(request, response, objectMapper,
                HttpStatus.FORBIDDEN, "access-denied", "The request is not allowed.");
    }

    @Bean
    AccountSessions accountSessions(SecurityContextRepository contexts, Clock clock) {
        return new AccountSessions(contexts, clock);
    }
}
