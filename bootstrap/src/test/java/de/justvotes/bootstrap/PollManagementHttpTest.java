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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class PollManagementHttpTest {
    private static final Path DATABASE_PATH = Path.of("target", "poll-management-" + UUID.randomUUID() + ".db");
    private static final Pattern CSRF_TOKEN = Pattern.compile("\\\"token\\\":\\\"([^\\\"]+)\\\"");
    private static final Pattern ID = Pattern.compile("\\\"id\\\":(\\d+)");

    @LocalServerPort
    int port;

    @DynamicPropertySource
    static void applicationProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:sqlite:" + DATABASE_PATH);
        registry.add("ADMIN_USERNAME", () -> "systemadmin");
        registry.add("ADMIN_PASSWORD_HASH", () -> new BCryptPasswordEncoder().encode("password"));
    }

    @Test
    void letsTheSystemAdminCreateAndEditPrivateDraftsFromTemplateGroupSnapshots() {
        String catalogUrl = "http://localhost:" + port + "/api/v1/admin/template-catalog";
        String pollsUrl = "http://localhost:" + port + "/api/v1/admin/polls";
        AuthenticatedAdmin admin = login();
        long zeta = createdId(admin.post(catalogUrl + "/templates", "{\"name\":\"Zeta\"}"));
        long alpha = createdId(admin.post(catalogUrl + "/templates", "{\"name\":\"Alpha\"}"));
        long group = createdId(admin.post(catalogUrl + "/groups", "{\"name\":\"Wahl\",\"description\":\"\"}"));
        assertEquals(204, admin.put(catalogUrl + "/groups/" + group + "/templates/" + zeta).getStatusCode().value());
        assertEquals(204, admin.put(catalogUrl + "/groups/" + group + "/templates/" + alpha).getStatusCode().value());

        ResponseEntity<String> created = admin.post(pollsUrl, "{\"title\":\"Vorstand\",\"templateGroupId\":" + group + "}");
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
        long template = createdId(admin.post(catalogUrl + "/templates", "{\"name\":\"Ja\"}"));
        long group = createdId(admin.post(catalogUrl + "/groups", "{\"name\":\"Öffentliche Wahl\",\"description\":\"\"}"));
        assertEquals(204, admin.put(catalogUrl + "/groups/" + group + "/templates/" + template).getStatusCode().value());
        ResponseEntity<String> created = admin.post(pollsUrl, "{\"title\":\"Vorstand\",\"templateGroupId\":" + group + "}");
        assertEquals(201, created.getStatusCode().value(), created.getBody());
        String pollId = stringField(created, "id");
        TestRestTemplate visitor = new TestRestTemplate();

        ResponseEntity<String> privatePoll = visitor.getForEntity(publicPollsUrl + "/" + pollId, String.class);
        assertEquals(404, privatePoll.getStatusCode().value(), privatePoll.getBody());
        assertEquals("no-store", privatePoll.getHeaders().getCacheControl());

        ResponseEntity<String> published = admin.put(pollsUrl + "/" + pollId + "/publication");
        assertEquals(200, published.getStatusCode().value(), published.getBody());
        assertTrue(published.getBody().contains("\"visibility\":\"public\""));
        assertTrue(published.getBody().contains("\"state\":\"active\""));
        assertTrue(visitor.getForEntity(publicPollsUrl, String.class).getBody().contains(pollId));
        assertEquals(200, visitor.getForEntity(publicPollsUrl + "/" + pollId, String.class).getStatusCode().value());

        assertEquals(200, admin.delete(pollsUrl + "/" + pollId + "/publication").getStatusCode().value());
        ResponseEntity<String> privatizedPoll = visitor.getForEntity(publicPollsUrl + "/" + pollId, String.class);
        assertEquals(404, privatizedPoll.getStatusCode().value());
        assertEquals("no-store", privatizedPoll.getHeaders().getCacheControl());
        assertTrue(!visitor.getForEntity(publicPollsUrl, String.class).getBody().contains(pollId));
    }

    private static long createdId(ResponseEntity<String> response) {
        assertEquals(201, response.getStatusCode().value());
        return id(response);
    }

    private static long id(ResponseEntity<String> response) {
        var matcher = ID.matcher(response.getBody());
        assertTrue(matcher.find());
        return Long.parseLong(matcher.group(1));
    }

    private static String stringField(ResponseEntity<String> response, String name) {
        var matcher = Pattern.compile("\\\"" + name + "\\\":\\\"([^\\\"]+)\\\"").matcher(response.getBody());
        assertTrue(matcher.find());
        return matcher.group(1);
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

    private static String cookieHeader(HttpHeaders headers) {
        return headers.get(HttpHeaders.SET_COOKIE).stream().map(cookie -> cookie.substring(0, cookie.indexOf(';')))
                .reduce((first, second) -> first + "; " + second).orElseThrow();
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
}
