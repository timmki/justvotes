package de.justvotes.bootstrap.support;

import de.justvotes.accountmanagement.core.model.Account;
import de.justvotes.accountmanagement.core.model.AccountIdentity;
import de.justvotes.accountmanagement.core.model.EmailAddress;
import de.justvotes.accountmanagement.core.ports.out.AccountRepository;
import de.justvotes.accountmanagement.core.ports.out.PasswordHasher;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.RequestEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Creates user accounts directly in the repository and signs accounts in through the real login
 * endpoint, so HTTP tests do not depend on the invitation flow.
 */
public final class AccountFixtures {
    public static final String ADMIN_EMAIL = "systemadmin@example.test";
    public static final String ADMIN_PASSWORD = "password";
    public static final String USER_PASSWORD = "user-password-123";
    private static final Pattern CSRF_TOKEN = Pattern.compile("\\\"token\\\":\\\"([^\\\"]+)\\\"");

    private final AccountRepository accounts;
    private final PasswordHasher hasher;
    private final TransactionTemplate transactions;
    private final String origin;

    public AccountFixtures(AccountRepository accounts, PasswordHasher hasher, PlatformTransactionManager transactionManager,
                           int port) {
        this.accounts = accounts;
        this.hasher = hasher;
        this.transactions = new TransactionTemplate(transactionManager);
        this.origin = "http://localhost:" + port;
    }

    public static String cookieHeader(HttpHeaders headers) {
        List<String> cookies = headers.get(HttpHeaders.SET_COOKIE);
        if (cookies == null) {
            return "";
        }
        return cookies.stream()
                .map(cookie -> cookie.substring(0, cookie.indexOf(';')))
                .filter(cookie -> !cookie.endsWith("="))
                .reduce((first, second) -> first + "; " + second)
                .orElse("");
    }

    /**
     * A stable email address for an identity, so the same identity always maps to the same account.
     */
    public static String email(String identity) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(identity.toLowerCase().getBytes(StandardCharsets.UTF_8));
            return "u-" + HexFormat.of().formatHex(digest).substring(0, 12) + "@example.test";
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }

    public Account user(String identity, String email, String password) {
        return transactions.execute(status -> accounts.findByEmailKey(email.toLowerCase())
                .orElseGet(() -> accounts.save(Account.createUser(AccountIdentity.of(identity),
                        EmailAddress.of(email), hasher.hash(password), Instant.now()))));
    }

    public Account userWithIdentity(String identity) {
        return user(identity, email(identity), USER_PASSWORD);
    }

    public TestSession anonymous() {
        TestRestTemplate client = new TestRestTemplate();
        ResponseEntity<String> csrf = client.getForEntity(origin + "/api/v1/csrf", String.class);
        Matcher matcher = CSRF_TOKEN.matcher(csrf.getBody());
        if (!matcher.find()) {
            throw new AssertionError("No CSRF token in " + csrf.getBody());
        }
        return new TestSession(client, cookieHeader(csrf.getHeaders()), matcher.group(1));
    }

    public ResponseEntity<String> attemptLogin(TestSession session, String email, String password) {
        return session.client().exchange(RequestEntity.post(origin + "/api/v1/session/login")
                .contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.COOKIE, session.cookies())
                .header("X-XSRF-TOKEN", session.csrfToken())
                .body("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"), String.class);
    }

    public TestSession login(String email, String password) {
        TestSession anonymous = anonymous();
        ResponseEntity<String> login = attemptLogin(anonymous, email, password);
        if (login.getStatusCode().value() != 200) {
            throw new AssertionError("Login failed for " + email + ": " + login.getStatusCode() + " " + login.getBody());
        }
        return new TestSession(anonymous.client(), anonymous.cookies() + "; " + cookieHeader(login.getHeaders()),
                anonymous.csrfToken());
    }

    public TestSession loginAsAdmin() {
        return login(ADMIN_EMAIL, ADMIN_PASSWORD);
    }

    /**
     * Signs in the user account owning the given identity, creating the account on first use.
     */
    public TestSession loginAsUser(String identity) {
        Account account = userWithIdentity(identity);
        return login(account.email().value(), USER_PASSWORD);
    }
}
