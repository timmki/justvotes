package de.justvotes.bootstrap.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRepository;

import java.io.IOException;

@Configuration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
class SecurityConfiguration {
    private static void validateAdminConfiguration(String username, String passwordHash) {
        if (username.isBlank()) {
            throw new IllegalStateException("ADMIN_USERNAME must not be blank.");
        }
        try {
            BCrypt.checkpw("configuration-validation", passwordHash);
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException("ADMIN_PASSWORD_HASH must be a BCrypt hash.", exception);
        }
    }

    static void writeProblemDetail(HttpServletRequest request, HttpServletResponse response, ObjectMapper objectMapper,
                                   HttpStatus status, String detail) throws IOException {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setInstance(java.net.URI.create(request.getRequestURI()));
        problem.setType(java.net.URI.create("https://justvotes.de/problems/" + status.value()));
        problem.setProperty("code", status == HttpStatus.UNAUTHORIZED ? "authentication-required" : "access-denied");
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), problem);
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, CsrfTokenRepository csrfTokenRepository,
                                            SecurityContextRepository securityContextRepository,
                                            AccessDeniedHandler problemDetailsAccessDeniedHandler,
                                            ObjectMapper objectMapper) throws Exception {
        return http
                .csrf(csrf -> csrf.csrfTokenRepository(csrfTokenRepository))
                .securityContext(context -> context.securityContextRepository(securityContextRepository))
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers("/api/v1/csrf", "/api/v1/admin/login").permitAll()
                        .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                        .anyRequest().permitAll())
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, exception) -> writeProblemDetail(request, response,
                                objectMapper, HttpStatus.UNAUTHORIZED, "Authentication is required."))
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
                HttpStatus.FORBIDDEN, "The request is not allowed.");
    }

    @Bean
    UserDetailsService systemAdmin(@Value("${ADMIN_USERNAME}") String username,
                                   @Value("${ADMIN_PASSWORD_HASH}") String passwordHash) {
        validateAdminConfiguration(username, passwordHash);
        return ignored -> User.withUsername(username)
                .password(passwordHash)
                .roles("ADMIN")
                .build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    AuthenticationManager authenticationManager(UserDetailsService systemAdmin, PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(systemAdmin);
        provider.setPasswordEncoder(passwordEncoder);
        return provider::authenticate;
    }
}
