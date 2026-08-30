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
class TemplateCatalogHttpTest {
    private static final Path DATABASE_PATH = Path.of("target", "template-catalog-" + UUID.randomUUID() + ".db");
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

    private static String cookieHeader(HttpHeaders headers) {
        return headers.get(HttpHeaders.SET_COOKIE).stream().map(cookie -> cookie.substring(0, cookie.indexOf(';')))
                .reduce((first, second) -> first + "; " + second).orElseThrow();
    }

    private static void assertNoStore(ResponseEntity<?> response) {
        assertTrue(response.getHeaders().getCacheControl().contains("no-store"));
    }

    @Test
    void letsOnlyTheSystemAdminManageTemplatesGroupsAndAssignments() {
        String baseUrl = "http://localhost:" + port + "/api/v1/admin/template-catalog";
        TestRestTemplate anonymous = new TestRestTemplate();
        ResponseEntity<String> unauthorized = anonymous.getForEntity(baseUrl + "/templates", String.class);
        assertEquals(401, unauthorized.getStatusCode().value());
        assertNoStore(unauthorized);

        AuthenticatedAdmin admin = login();
        ResponseEntity<String> createdTemplate = admin.post(baseUrl + "/templates", "{\"name\":\"  Vorstand  \"}");
        assertNoStore(createdTemplate);
        String templateId = createdId(createdTemplate);
        ResponseEntity<String> duplicateGroup = admin.post(baseUrl + "/groups", "{\"name\":\" vorstand \",\"description\":\"\"}");
        assertEquals(409, duplicateGroup.getStatusCode().value());
        assertNoStore(duplicateGroup);
        ResponseEntity<String> rename = admin.patch(baseUrl + "/templates/" + templateId, "{\"name\":\" Beirat \"}");
        assertEquals(200, rename.getStatusCode().value());
        assertNoStore(rename);
        assertEquals(templateId, id(rename));
        ResponseEntity<String> createdFirstGroup = admin.post(baseUrl + "/groups", "{\"name\":\"Gremium A\",\"description\":\"\"}");
        assertNoStore(createdFirstGroup);
        String firstGroupId = createdId(createdFirstGroup);
        ResponseEntity<String> createdSecondGroup = admin.post(baseUrl + "/groups", "{\"name\":\"Gremium B\",\"description\":\"\"}");
        assertNoStore(createdSecondGroup);
        String secondGroupId = createdId(createdSecondGroup);
        ResponseEntity<String> duplicateGroupRename = admin.patch(baseUrl + "/groups/" + firstGroupId, "{\"name\":\" gremium b \"}");
        assertEquals(409, duplicateGroupRename.getStatusCode().value());
        assertNoStore(duplicateGroupRename);

        ResponseEntity<String> firstAssignment = admin.put(baseUrl + "/groups/" + firstGroupId + "/templates/" + templateId);
        assertEquals(204, firstAssignment.getStatusCode().value(), firstAssignment.getBody());
        assertNoStore(firstAssignment);
        ResponseEntity<String> secondAssignment = admin.put(baseUrl + "/groups/" + secondGroupId + "/templates/" + templateId);
        assertEquals(204, secondAssignment.getStatusCode().value());
        assertNoStore(secondAssignment);
        ResponseEntity<String> deletedGroup = admin.delete(baseUrl + "/groups/" + firstGroupId);
        assertEquals(204, deletedGroup.getStatusCode().value());
        assertNoStore(deletedGroup);
        ResponseEntity<String> groupTemplates = admin.get(baseUrl + "/groups/" + secondGroupId + "/templates");
        assertNoStore(groupTemplates);
        assertTrue(groupTemplates.getBody().contains("Beirat"));

        ResponseEntity<String> deletedTemplate = admin.delete(baseUrl + "/templates/" + templateId);
        assertEquals(204, deletedTemplate.getStatusCode().value());
        assertNoStore(deletedTemplate);
        ResponseEntity<String> emptyGroupTemplates = admin.get(baseUrl + "/groups/" + secondGroupId + "/templates");
        assertNoStore(emptyGroupTemplates);
        assertEquals("[]", emptyGroupTemplates.getBody());
        ResponseEntity<String> duplicateGroupAfterDelete = admin.post(baseUrl + "/groups", "{\"name\":\" gremium b \",\"description\":\"\"}");
        assertEquals(409, duplicateGroupAfterDelete.getStatusCode().value());
        assertNoStore(duplicateGroupAfterDelete);
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

    private record AuthenticatedAdmin(TestRestTemplate client, String cookies, String csrfToken) {
        ResponseEntity<String> get(String url) {
            return client.exchange(RequestEntity.get(url).header(HttpHeaders.COOKIE, cookies).build(), String.class);
        }

        ResponseEntity<String> post(String url, String body) {
            return client.exchange(RequestEntity.post(url).contentType(MediaType.APPLICATION_JSON).header(HttpHeaders.COOKIE, cookies).header("X-XSRF-TOKEN", csrfToken).body(body), String.class);
        }

        ResponseEntity<String> patch(String url, String body) {
            return client.exchange(RequestEntity.patch(url).contentType(MediaType.APPLICATION_JSON).header(HttpHeaders.COOKIE, cookies).header("X-XSRF-TOKEN", csrfToken).body(body), String.class);
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
