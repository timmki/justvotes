package de.justvotes.bootstrap;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.RequestEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.nio.file.Path;
import java.util.UUID;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class PollManagementHttpTest {
    private static final Path DATABASE_PATH = Path.of("target", "poll-management-" + UUID.randomUUID() + ".db");
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
        assertEquals(201, response.getStatusCode().value());
        return id(response);
    }

    private static String id(ResponseEntity<String> response) {
        var matcher = ID.matcher(response.getBody());
        assertTrue(matcher.find());
        return matcher.group(1);
    }

    private static String stringField(ResponseEntity<String> response, String name) {
        var matcher = Pattern.compile("\\\"" + name + "\\\":\\\"([^\\\"]+)\\\"").matcher(response.getBody());
        assertTrue(matcher.find());
        return matcher.group(1);
    }

    private static String cookieHeader(HttpHeaders headers) {
        return headers.get(HttpHeaders.SET_COOKIE).stream().map(cookie -> cookie.substring(0, cookie.indexOf(';')))
                .reduce((first, second) -> first + "; " + second).orElseThrow();
    }

    @Test
    void letsTheSystemAdminCreateAndEditPrivateDraftsFromTemplateGroupSnapshots() {
        String catalogUrl = "http://localhost:" + port + "/api/v1/admin/template-catalog";
        String pollsUrl = "http://localhost:" + port + "/api/v1/admin/polls";
        AuthenticatedAdmin admin = login();
        String zeta = createdId(admin.post(catalogUrl + "/templates", "{\"name\":\"Zeta\"}"));
        String alpha = createdId(admin.post(catalogUrl + "/templates", "{\"name\":\"Alpha\"}"));
        String group = createdId(admin.post(catalogUrl + "/groups", "{\"name\":\"Wahl\",\"description\":\"\"}"));
        assertEquals(204, admin.put(catalogUrl + "/groups/" + group + "/templates/" + zeta).getStatusCode().value());
        assertEquals(204, admin.put(catalogUrl + "/groups/" + group + "/templates/" + alpha).getStatusCode().value());

        ResponseEntity<String> created = admin.post(pollsUrl, "{\"title\":\"Vorstand\",\"templateGroupId\":\"" + group + "\"}");
        assertEquals(201, created.getStatusCode().value(), created.getBody());
        assertTrue(created.getBody().contains("\"visibility\":\"private\""));
        assertTrue(created.getBody().contains("\"state\":\"draft\""));
        assertTrue(created.getBody().indexOf("alpha") < created.getBody().indexOf("zeta"));
        String pollId = stringField(created, "id");

        ResponseEntity<String> edited = admin.put(pollsUrl + "/" + pollId + "/options", "{\"optionTexts\":[\"Ja\",\"Nein\"]}");
        assertEquals(200, edited.getStatusCode().value(), edited.getBody());
        assertTrue(edited.getBody().contains("Ja"));
        assertTrue(edited.getBody().contains("alpha"));
        assertTrue(edited.getBody().contains("zeta"));
        assertEquals(400, admin.put(pollsUrl + "/" + pollId + "/options", "{\"optionTexts\":[\" Ja \",\"ja\"]}").getStatusCode().value());
        assertTrue(admin.get(pollsUrl).getBody().contains(pollId));
    }

    @Test
    void exposesOnlyPublishedPollsAndMakesPrivatizedPollsImmediatelyUnavailable() {
        String catalogUrl = "http://localhost:" + port + "/api/v1/admin/template-catalog";
        String pollsUrl = "http://localhost:" + port + "/api/v1/admin/polls";
        String publicPollsUrl = "http://localhost:" + port + "/api/v1/polls";
        AuthenticatedAdmin admin = login();
        String template = createdId(admin.post(catalogUrl + "/templates", "{\"name\":\"Sichtbarkeit\"}"));
        String group = createdId(admin.post(catalogUrl + "/groups", "{\"name\":\"Öffentliche Wahl\",\"description\":\"\"}"));
        assertEquals(204, admin.put(catalogUrl + "/groups/" + group + "/templates/" + template).getStatusCode().value());
        ResponseEntity<String> created = admin.post(pollsUrl, "{\"title\":\"Vorstand\",\"templateGroupId\":\"" + group + "\"}");
        assertEquals(201, created.getStatusCode().value(), created.getBody());
        String pollId = stringField(created, "id");
        TestRestTemplate visitor = new TestRestTemplate();

        ResponseEntity<String> privatePoll = visitor.getForEntity(publicPollsUrl + "/" + pollId, String.class);
        assertEquals(404, privatePoll.getStatusCode().value(), privatePoll.getBody());
        assertTrue(privatePoll.getHeaders().getCacheControl().contains("no-store"));

        ResponseEntity<String> published = admin.put(pollsUrl + "/" + pollId + "/publication", "{\"endsAt\":\"2099-01-01T00:00:00Z\"}");
        assertEquals(200, published.getStatusCode().value(), published.getBody());
        assertTrue(published.getBody().contains("\"visibility\":\"public\""));
        assertTrue(published.getBody().contains("\"state\":\"active\""));
        assertTrue(visitor.getForEntity(publicPollsUrl, String.class).getBody().contains(pollId));
        assertEquals(200, visitor.getForEntity(publicPollsUrl + "/" + pollId, String.class).getStatusCode().value());

        assertEquals(200, admin.delete(pollsUrl + "/" + pollId + "/publication").getStatusCode().value());
        ResponseEntity<String> privatizedPoll = visitor.getForEntity(publicPollsUrl + "/" + pollId, String.class);
        assertEquals(404, privatizedPoll.getStatusCode().value());
        assertTrue(privatizedPoll.getHeaders().getCacheControl().contains("no-store"));
        assertFalse(visitor.getForEntity(publicPollsUrl, String.class).getBody().contains(pollId));
    }

    @Test
    void storesNormalizedIdentityAndReportsCreatedReplacedAndUnchangedVotesInThePublicAudit() {
        String catalogUrl = "http://localhost:" + port + "/api/v1/admin/template-catalog";
        String pollsUrl = "http://localhost:" + port + "/api/v1/admin/polls";
        String publicPollsUrl = "http://localhost:" + port + "/api/v1/polls";
        AuthenticatedAdmin admin = login();
        String yes = createdId(admin.post(catalogUrl + "/templates", "{\"name\":\"Ja\"}"));
        String no = createdId(admin.post(catalogUrl + "/templates", "{\"name\":\"Nein\"}"));
        String group = createdId(admin.post(catalogUrl + "/groups", "{\"name\":\"Abstimmung\",\"description\":\"\"}"));
        admin.put(catalogUrl + "/groups/" + group + "/templates/" + yes);
        admin.put(catalogUrl + "/groups/" + group + "/templates/" + no);
        String pollId = stringField(admin.post(pollsUrl, "{\"title\":\"Vorstand\",\"templateGroupId\":\"" + group + "\"}"), "id");
        admin.put(pollsUrl + "/" + pollId + "/publication", "{\"endsAt\":\"2099-01-01T00:00:00Z\"}");

        PublicVisitor visitor = publicVisitor();
        ResponseEntity<String> identity = visitor.post("http://localhost:" + port + "/api/v1/identity", "{\"userID\":\"  Alice_1  \"}");
        assertEquals(204, identity.getStatusCode().value(), identity.getBody());
        assertTrue(identity.getHeaders().get(HttpHeaders.SET_COOKIE).stream().anyMatch(cookie -> cookie.startsWith("userID=alice_1;")));
        visitor = new PublicVisitor(visitor.client(), visitor.cookies() + "; userID=alice_1", visitor.csrfToken());

        ResponseEntity<String> created = visitor.post(publicPollsUrl + "/" + pollId + "/votes", "{\"optionNumber\":1}");
        assertEquals(200, created.getStatusCode().value(), created.getBody());
        assertTrue(created.getBody().contains("\"status\":\"created\""));
        ResponseEntity<String> unchanged = visitor.post(publicPollsUrl + "/" + pollId + "/votes", "{\"optionNumber\":1}");
        assertEquals(200, unchanged.getStatusCode().value(), unchanged.getBody());
        assertTrue(unchanged.getBody().contains("\"status\":\"unchanged\""));
        ResponseEntity<String> replaced = visitor.post(publicPollsUrl + "/" + pollId + "/votes", "{\"optionNumber\":2}");
        assertEquals(200, replaced.getStatusCode().value(), replaced.getBody());
        assertTrue(replaced.getBody().contains("\"status\":\"replaced\""));

        ResponseEntity<String> audit = visitor.get(publicPollsUrl + "/" + pollId + "/audit");
        assertEquals(200, audit.getStatusCode().value(), audit.getBody());
        assertTrue(audit.getBody().contains("alice_1"));
        assertTrue(audit.getBody().contains("VoteCast"));
        assertTrue(audit.getBody().contains("VoteReplaced"));
        assertTrue(
                audit.getBody().contains("\"selection\":\"ja\"")
                        || audit.getBody().contains("\"selection\":\"nein\""),
                audit.getBody()
        );
    }

    private AuthenticatedAdmin login() {
        TestRestTemplate client = new TestRestTemplate();
        String origin = "http://localhost:" + port;
        ResponseEntity<String> csrf = client.getForEntity(origin + "/api/v1/csrf", String.class);
        var matcher = CSRF_TOKEN.matcher(csrf.getBody());
        assertTrue(matcher.find());
        String token = matcher.group(1);
        String cookies = cookieHeader(csrf.getHeaders());
        ResponseEntity<String> login = client.exchange(RequestEntity.post(origin + "/api/v1/admin/login")
                .contentType(MediaType.APPLICATION_JSON).header(HttpHeaders.COOKIE, cookies).header("X-XSRF-TOKEN", token)
                .body("{\"username\":\"systemadmin\",\"password\":\"password\"}"), String.class);
        assertEquals(204, login.getStatusCode().value());
        return new AuthenticatedAdmin(client, cookies + "; " + cookieHeader(login.getHeaders()), token);
    }

    private PublicVisitor publicVisitor() {
        TestRestTemplate client = new TestRestTemplate();
        String origin = "http://localhost:" + port;
        ResponseEntity<String> csrf = client.getForEntity(origin + "/api/v1/csrf", String.class);
        var matcher = CSRF_TOKEN.matcher(csrf.getBody());
        assertTrue(matcher.find());
        return new PublicVisitor(client, cookieHeader(csrf.getHeaders()), matcher.group(1));
    }

    private record AuthenticatedAdmin(TestRestTemplate client, String cookies, String csrfToken) {
        ResponseEntity<String> get(String url) {
            return client.exchange(RequestEntity.get(url).header(HttpHeaders.COOKIE, cookies).build(), String.class);
        }

        ResponseEntity<String> post(String url, String body) {
            return client.exchange(RequestEntity.post(url).contentType(MediaType.APPLICATION_JSON).header(HttpHeaders.COOKIE, cookies).header("X-XSRF-TOKEN", csrfToken).body(body), String.class);
        }

        ResponseEntity<String> put(String url) {
            return client.exchange(RequestEntity.put(url).header(HttpHeaders.COOKIE, cookies).header("X-XSRF-TOKEN", csrfToken).build(), String.class);
        }

        ResponseEntity<String> put(String url, String body) {
            return client.exchange(RequestEntity.put(url).contentType(MediaType.APPLICATION_JSON).header(HttpHeaders.COOKIE, cookies).header("X-XSRF-TOKEN", csrfToken).body(body), String.class);
        }

        ResponseEntity<String> delete(String url) {
            return client.exchange(RequestEntity.delete(url).header(HttpHeaders.COOKIE, cookies).header("X-XSRF-TOKEN", csrfToken).build(), String.class);
        }
    }

    private record PublicVisitor(TestRestTemplate client, String cookies, String csrfToken) {
        ResponseEntity<String> get(String url) {
            return client.exchange(RequestEntity.get(url).header(HttpHeaders.COOKIE, cookies).build(), String.class);
        }

        ResponseEntity<String> post(String url, String body) {
            return client.exchange(RequestEntity.post(url).contentType(MediaType.APPLICATION_JSON)
                    .header(HttpHeaders.COOKIE, cookies).header("X-XSRF-TOKEN", csrfToken).body(body), String.class);
        }
    }
}
