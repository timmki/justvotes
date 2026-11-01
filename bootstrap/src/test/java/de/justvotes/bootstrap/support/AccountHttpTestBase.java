package de.justvotes.bootstrap.support;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import de.justvotes.accountmanagement.core.ports.out.AccountRepository;
import de.justvotes.accountmanagement.core.ports.out.PasswordHasher;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.PlatformTransactionManager;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Shared helpers for HTTP tests of the account features.
 */
public abstract class AccountHttpTestBase {
    protected static final ObjectMapper JSON = new ObjectMapper();

    @LocalServerPort
    protected int port;
    @Autowired
    protected AccountRepository accounts;
    @Autowired
    protected PasswordHasher hasher;
    @Autowired
    protected PlatformTransactionManager transactionManager;

    protected static JsonNode json(ResponseEntity<String> response) {
        try {
            return JSON.readTree(response.getBody());
        } catch (Exception exception) {
            throw new AssertionError("No JSON body: " + response.getBody(), exception);
        }
    }

    protected static void assertProblem(ResponseEntity<String> response, int status, String code) {
        assertThat(response.getStatusCode().value()).as(response.getBody()).isEqualTo(status);
        assertThat(response.getHeaders().getCacheControl()).contains("no-store");
        assertThat(response.getHeaders().getContentType()).hasToString("application/problem+json");
        assertThat(json(response).path("code").asText()).isEqualTo(code);
    }

    protected AccountFixtures fixtures() {
        return new AccountFixtures(accounts, hasher, transactionManager, port);
    }

    protected String url(String path) {
        return "http://localhost:" + port + "/api/v1" + path;
    }
}
