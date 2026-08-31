package de.justvotes.bootstrap;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import de.justvotes.adapters.shared.infra.in.http.OpaqueIdCodec;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.nio.file.Path;
import java.util.UUID;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AdministrativeVotesHttpTest {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final Path DATABASE_PATH = Path.of("target", "administrative-votes-" + UUID.randomUUID() + ".db");
    private static final Pattern CSRF_TOKEN = Pattern.compile("\\\"token\\\":\\\"([^\\\"]+)\\\"");
    private static final Pattern ID = Pattern.compile("\\\"id\\\":\\\"([^\\\"]+)\\\"");

    @LocalServerPort
    int port;

    @DynamicPropertySource
    static void applicationProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:sqlite:" + DATABASE_PATH);
        registry.add("ADMIN_USERNAME", () -> "systemadmin");
        registry.add("ADMIN_PASSWORD_HASH", () -> new BCryptPasswordEncoder().encode("password"));
    }

    private static String createdId(ResponseEntity<String> response) {
        assertEquals(201, response.getStatusCode().value(), response.getBody());
        var matcher = ID.matcher(response.getBody());
        assertTrue(matcher.find());
        return matcher.group(1);
    }

    private static String token(ResponseEntity<String> response) {
        var matcher = CSRF_TOKEN.matcher(response.getBody());
        assertTrue(matcher.find());
        return matcher.group(1);
    }

    private static String cookies(ResponseEntity<String> response) {
        return response.getHeaders().get(HttpHeaders.SET_COOKIE).stream()
                .map(value -> value.substring(0, value.indexOf(';')))
                .reduce((left, right) -> left + "; " + right).orElseThrow();
    }

    private static void assertProblem(ResponseEntity<String> response, int status, String code) {
        assertEquals(status, response.getStatusCode().value(), response.getBody());
        assertTrue(response.getHeaders().getCacheControl().contains("no-store"));
        JsonNode body;
        try {
            body = JSON.readTree(response.getBody());
        } catch (Exception exception) {
            throw new AssertionError(response.getBody(), exception);
        }
        assertEquals(code, body.path("code").asText());
    }

    @Test
    void listsAndRemovesCurrentVotesWithStablePagingAndCompleteAudit() throws Exception {
        String baseUrl = "http://localhost:" + port;
        String catalogUrl = baseUrl + "/api/v1/admin/template-catalog";
        String pollsUrl = baseUrl + "/api/v1/admin/polls";
        String publicUrl = baseUrl + "/api/v1/polls";
        AuthenticatedAdmin admin = login();
        String yes = createdId(admin.post(catalogUrl + "/templates", "{\"name\":\"Admin-Ja\"}"));
        String no = createdId(admin.post(catalogUrl + "/templates", "{\"name\":\"Admin-Nein\"}"));
        String group = createdId(admin.post(catalogUrl + "/groups", "{\"name\":\"Admin-Gruppe\",\"description\":\"\"}"));
        admin.put(catalogUrl + "/groups/" + group + "/templates/" + yes);
        admin.put(catalogUrl + "/groups/" + group + "/templates/" + no);
        String alpha = createdId(admin.post(pollsUrl, "{\"title\":\"Alpha\",\"templateGroupId\":\"" + group + "\"}"));
        String beta = createdId(admin.post(pollsUrl, "{\"title\":\"Beta\",\"templateGroupId\":\"" + group + "\"}"));
        admin.put(pollsUrl + "/" + alpha + "/publication", "{\"endsAt\":\"2099-01-01T00:00:00Z\"}");
        admin.put(pollsUrl + "/" + beta + "/publication", "{\"endsAt\":\"2099-01-01T00:00:00Z\"}");

        PublicVisitor alice = visitor();
        alice = alice.withIdentity("alice");
        PublicVisitor bob = visitor();
        bob = bob.withIdentity("bob");
        assertEquals(200, alice.post(publicUrl + "/" + alpha + "/votes", "{\"optionNumber\":1}").getStatusCode().value());
        assertEquals(200, bob.post(publicUrl + "/" + alpha + "/votes", "{\"optionNumber\":2}").getStatusCode().value());
        assertEquals(200, bob.post(publicUrl + "/" + beta + "/votes", "{\"optionNumber\":1}").getStatusCode().value());

        ResponseEntity<String> unauthenticated = new TestRestTemplate().getForEntity(baseUrl + "/api/v1/admin/votes", String.class);
        assertProblem(unauthenticated, 401, "authentication-required");

        ResponseEntity<String> firstPage = admin.get(baseUrl + "/api/v1/admin/votes?page=0&size=1");
        assertEquals(200, firstPage.getStatusCode().value(), firstPage.getBody());
        assertTrue(firstPage.getBody().contains("\"totalElements\":3"));
        assertTrue(firstPage.getBody().contains("\"page\":0"));
        assertTrue(firstPage.getBody().contains("\"size\":1"));
        assertTrue(firstPage.getBody().contains("\"title\":\"Alpha\""));
        assertTrue(firstPage.getBody().contains("\"userID\":\"alice\""));
        assertTrue(firstPage.getBody().contains("\"voteId\":\"v_v1_"));
        String voteId = JSON.readTree(firstPage.getBody()).path("votes").get(0).path("voteId").asText();
        ResponseEntity<String> secondPage = admin.get(baseUrl + "/api/v1/admin/votes?page=1&size=1");
        assertTrue(secondPage.getBody().contains("\"title\":\"Alpha\""));
        assertTrue(secondPage.getBody().contains("\"userID\":\"bob\""));
        ResponseEntity<String> thirdPage = admin.get(baseUrl + "/api/v1/admin/votes?page=2&size=1");
        assertTrue(thirdPage.getBody().contains("\"title\":\"Beta\""));
        assertEquals(400, admin.get(baseUrl + "/api/v1/admin/votes?page=0&size=101").getStatusCode().value());

        assertProblem(admin.deleteWithoutCsrf(baseUrl + "/api/v1/admin/votes/" + voteId, "{\"reason\":\"Regelverstoß\"}"), 403, "access-denied");
        assertProblem(admin.delete(baseUrl + "/api/v1/admin/votes/" + voteId, null), 400, "invalid-request");
        assertProblem(admin.delete(baseUrl + "/api/v1/admin/votes/" + voteId, "{\"reason\":\"   \"}"), 400, "invalid-request");

        ResponseEntity<String> removed = admin.delete(baseUrl + "/api/v1/admin/votes/" + voteId, "{\"reason\":\"  Regelverstoß  \"}");
        assertEquals(204, removed.getStatusCode().value());
        assertTrue(removed.getHeaders().getCacheControl().contains("no-store"));
        assertProblem(admin.delete(baseUrl + "/api/v1/admin/votes/" + voteId, "{\"reason\":\"Regelverstoß\"}"), 404, "resource-not-found");
        assertProblem(admin.delete(baseUrl + "/api/v1/admin/votes/" + OpaqueIdCodec.encode("v", 9999L), "{\"reason\":\"Regelverstoß\"}"), 404, "resource-not-found");

        ResponseEntity<String> remaining = admin.get(baseUrl + "/api/v1/admin/votes");
        assertTrue(remaining.getBody().contains("\"totalElements\":2"));
        assertFalse(remaining.getBody().contains("\"userID\":\"alice\""));
        ResponseEntity<String> results = bob.get(publicUrl + "/" + alpha + "/results");
        assertEquals(200, results.getStatusCode().value(), results.getBody());
        assertTrue(results.getBody().contains("\"totalVotes\":1"));
        assertEquals(200, bob.post(publicUrl + "/" + alpha + "/votes", "{\"optionNumber\":1}").getStatusCode().value());
        ResponseEntity<String> audit = bob.get(publicUrl + "/" + alpha + "/audit");
        assertEquals(200, audit.getStatusCode().value(), audit.getBody());
        assertTrue(audit.getBody().contains("\"event\":\"VoteRemovedByAdmin\""));
        assertTrue(audit.getBody().contains("\"actor\":\"systemadmin\""));
        assertTrue(audit.getBody().contains("\"reason\":\"Regelverstoß\""));
        assertTrue(audit.getBody().contains("\"userID\":\"alice\""));
        assertTrue(audit.getBody().contains("\"optionNumber\":1"));
        assertTrue(audit.getBody().contains("\"votedAt\":\""));
        assertFalse(audit.getBody().contains("\"voteId\""));
    }

    private AuthenticatedAdmin login() {
        TestRestTemplate client = new TestRestTemplate();
        String baseUrl = "http://localhost:" + port;
        ResponseEntity<String> csrf = client.getForEntity(baseUrl + "/api/v1/csrf", String.class);
        String token = token(csrf);
        String cookies = cookies(csrf);
        ResponseEntity<String> login = client.exchange(RequestEntity.post(baseUrl + "/api/v1/admin/login")
                .contentType(MediaType.APPLICATION_JSON).header(HttpHeaders.COOKIE, cookies).header("X-XSRF-TOKEN", token)
                .body("{\"username\":\"systemadmin\",\"password\":\"password\"}"), String.class);
        assertEquals(204, login.getStatusCode().value());
        return new AuthenticatedAdmin(client, cookies + "; " + cookies(login), token);
    }

    private PublicVisitor visitor() {
        TestRestTemplate client = new TestRestTemplate();
        String baseUrl = "http://localhost:" + port;
        ResponseEntity<String> csrf = client.getForEntity(baseUrl + "/api/v1/csrf", String.class);
        return new PublicVisitor(client, cookies(csrf), token(csrf), port);
    }

    private record AuthenticatedAdmin(TestRestTemplate client, String cookies, String csrfToken) {
        ResponseEntity<String> get(String url) {
            return client.exchange(RequestEntity.get(url).header(HttpHeaders.COOKIE, cookies).build(), String.class);
        }

        ResponseEntity<String> post(String url, String body) {
            return client.exchange(RequestEntity.post(url).contentType(MediaType.APPLICATION_JSON)
                    .header(HttpHeaders.COOKIE, cookies).header("X-XSRF-TOKEN", csrfToken).body(body), String.class);
        }

        ResponseEntity<String> put(String url, String body) {
            return client.exchange(RequestEntity.put(url).contentType(MediaType.APPLICATION_JSON)
                    .header(HttpHeaders.COOKIE, cookies).header("X-XSRF-TOKEN", csrfToken).body(body), String.class);
        }

        ResponseEntity<String> put(String url) {
            return client.exchange(RequestEntity.put(url).header(HttpHeaders.COOKIE, cookies)
                    .header("X-XSRF-TOKEN", csrfToken).build(), String.class);
        }

        ResponseEntity<String> delete(String url, String body) {
            return client.exchange(RequestEntity.method(HttpMethod.DELETE, url).contentType(MediaType.APPLICATION_JSON)
                    .header(HttpHeaders.COOKIE, cookies).header("X-XSRF-TOKEN", csrfToken).body(body), String.class);
        }

        ResponseEntity<String> deleteWithoutCsrf(String url, String body) {
            return client.exchange(RequestEntity.method(HttpMethod.DELETE, url).contentType(MediaType.APPLICATION_JSON)
                    .header(HttpHeaders.COOKIE, cookies).body(body), String.class);
        }
    }

    private record PublicVisitor(TestRestTemplate client, String cookies, String csrfToken, int port) {
        PublicVisitor withIdentity(String identity) {
            ResponseEntity<String> changed = post("http://localhost:" + port + "/api/v1/identity", "{\"userID\":\"" + identity + "\"}");
            assertEquals(204, changed.getStatusCode().value());
            return new PublicVisitor(client, cookies + "; userID=" + identity, csrfToken, port);
        }

        ResponseEntity<String> get(String url) {
            return client.exchange(RequestEntity.get(url).header(HttpHeaders.COOKIE, cookies).build(), String.class);
        }

        ResponseEntity<String> post(String url, String body) {
            return client.exchange(RequestEntity.post(url).contentType(MediaType.APPLICATION_JSON)
                    .header(HttpHeaders.COOKIE, cookies).header("X-XSRF-TOKEN", csrfToken).body(body), String.class);
        }

    }
}
