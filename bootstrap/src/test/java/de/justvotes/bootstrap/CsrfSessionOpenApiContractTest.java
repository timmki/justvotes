package de.justvotes.bootstrap;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.RequestEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.yaml.snakeyaml.Yaml;

import java.io.InputStream;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class CsrfSessionOpenApiContractTest {
    private static final Path DATABASE_PATH = Path.of("target", "csrf-contract-" + UUID.randomUUID() + ".db");
    private static final Pattern TOKEN = Pattern.compile("\\\"token\\\":\\\"([^\\\"]+)\\\"");

    @LocalServerPort int port;

    @DynamicPropertySource
    static void applicationProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:sqlite:" + DATABASE_PATH);
        registry.add("ADMIN_USERNAME", () -> "systemadmin");
        registry.add("ADMIN_PASSWORD_HASH", () -> new BCryptPasswordEncoder().encode("password"));
    }

    @Test
    void openApiSecurityRequirementsMatchTheRuntimeForEveryAdminMutation() {
        Map<String, Object> paths = map(map(new Yaml().load(resource("docs/justvotes-v1.yaml"))).get("paths"));
        TestRestTemplate client = new TestRestTemplate();
        String baseUrl = "http://localhost:" + port + "/api/v1";
        ResponseEntity<String> bootstrap = client.getForEntity(baseUrl + "/csrf", String.class);
        assertThat(bootstrap.getHeaders().getCacheControl()).contains("no-store");
        String csrfCookie = cookies(bootstrap);
        String token = token(bootstrap);

        paths.forEach((path, pathItem) -> map(pathItem).forEach((method, value) -> {
            if (!(value instanceof Map)) return;
            Map<String, Object> operation = map(value);
            String url = baseUrl + path.replace("{pollId}", "p_v1_missing").replace("{groupId}", "g_v1_missing").replace("{templateId}", "t_v1_missing");
            if (method.equals("get") && path.startsWith("/admin/")) {
                assertSecurity(operation, "adminSession");
                assertResponses(operation, "401");
                assertStatus(client.exchange(RequestEntity.get(url).build(), String.class), 401);
                return;
            }
            if (!List.of("post", "put", "patch", "delete").contains(method)) return;
            if (path.equals("/admin/login")) {
                assertSecurity(operation, "csrf", "csrfCookie");
                assertResponses(operation, "401", "403");
                assertStatus(client.exchange(request(method, url, null, null, "{\"username\":\"systemadmin\",\"password\":\"wrong\"}"), String.class), 403);
                assertStatus(client.exchange(request(method, url, null, token, "{\"username\":\"systemadmin\",\"password\":\"wrong\"}"), String.class), 403);
                assertStatus(client.exchange(request(method, url, csrfCookie, token, "{\"username\":\"systemadmin\",\"password\":\"wrong\"}"), String.class), 401);
                return;
            }
            if (!path.startsWith("/admin/")) {
                if (hasSecurity(operation, "csrf")) {
                    assertSecurity(operation, "csrf", "csrfCookie");
                    assertResponses(operation, "403");
                    assertStatus(client.exchange(request(method, url, null, null, "{}"), String.class), 403);
                }
                return;
            }
            assertSecurity(operation, "adminSession", "csrf", "csrfCookie");
            assertResponses(operation, "401", "403");
            assertStatus(client.exchange(request(method, url, null, null, "{}"), String.class), 403);
            assertStatus(client.exchange(request(method, url, null, token, "{}"), String.class), 403);
            assertStatus(client.exchange(request(method, url, csrfCookie, token, "{}"), String.class), 401);
        }));
    }

    @Test
    void documentsNoStoreForEveryApiResponse() {
        Map<String, Object> document = map(new Yaml().load(resource("docs/justvotes-v1.yaml")));
        Map<String, Object> paths = map(document.get("paths"));
        Map<String, Object> components = map(document.get("components"));
        Map<String, Object> responseComponents = map(components.get("responses"));

        paths.forEach((path, pathItem) -> map(pathItem).forEach((method, value) -> {
            if (!(value instanceof Map)) return;
            Map<String, Object> operation = map(value);
            map(operation.get("responses")).forEach((status, response) -> {
                Map<String, Object> responseDefinition = map(response);
                if (responseDefinition.containsKey("$ref")) {
                    String reference = (String) responseDefinition.get("$ref");
                    responseDefinition = map(responseComponents.get(reference.substring(reference.lastIndexOf('/') + 1)));
                }
                assertThat(map(responseDefinition.get("headers"))).containsKey("Cache-Control");
                assertThat(map(responseDefinition.get("headers")).get("Cache-Control")).isEqualTo(Map.of("$ref", "#/components/headers/NoStore"));
            });
        }));
    }

    @Test
    void documentsCurrentIdentityAsAnUnauthenticatedParameterlessRead() {
        Map<String, Object> paths = map(map(new Yaml().load(resource("docs/justvotes-v1.yaml"))).get("paths"));
        Map<String, Object> currentIdentity = map(map(paths.get("/identity")).get("get"));

        assertThat(currentIdentity).doesNotContainKeys("security", "parameters");
        assertThat(map(currentIdentity.get("responses"))).containsKey("200");
    }

    @Test
    void documentsPollResultsAsAnUnauthenticatedReadWithVisibilityFailures() {
        Map<String, Object> paths = map(map(new Yaml().load(resource("docs/justvotes-v1.yaml"))).get("paths"));
        Map<String, Object> pollResults = map(map(paths.get("/polls/{pollId}/results")).get("get"));

        assertThat(pollResults).doesNotContainKeys("security", "parameters", "requestBody");
        assertThat(map(pollResults.get("responses"))).containsKeys("200", "403", "404");
    }

    @Test
    void documentsVoteWithdrawalAsACsrfProtectedIdentityBoundMutation() {
        Map<String, Object> paths = map(map(new Yaml().load(resource("docs/justvotes-v1.yaml"))).get("paths"));
        Map<String, Object> withdrawal = map(map(paths.get("/polls/{pollId}/votes")).get("delete"));

        assertThat(withdrawal.get("operationId")).isEqualTo("withdrawVote");
        assertSecurity(withdrawal, "voterIdentity", "csrf", "csrfCookie");
        assertThat(withdrawal).doesNotContainKey("requestBody");
        assertResponses(withdrawal, "204", "403", "404", "409");
    }

    @Test
    void documentsCreationTimeAndCurrentVoteCountOnPublicPollSummaries() {
        Map<String, Object> components = map(map(new Yaml().load(resource("docs/justvotes-v1.yaml"))).get("components"));
        Map<String, Object> schemas = map(components.get("schemas"));
        Map<String, Object> poll = map(schemas.get("Poll"));

        assertThat(poll.get("required").toString()).contains("createdAt", "endsAt", "totalVotes");
        assertThat(map(poll.get("properties"))).containsKeys("createdAt", "totalVotes");
    }

    private static RequestEntity<String> request(String method, String url, String cookies, String csrfToken, String body) {
        RequestEntity.BodyBuilder request = RequestEntity.method(HttpMethod.valueOf(method.toUpperCase()), url).contentType(MediaType.APPLICATION_JSON);
        if (cookies != null) request.header(HttpHeaders.COOKIE, cookies);
        if (csrfToken != null) request.header("X-XSRF-TOKEN", csrfToken);
        return request.body(body);
    }

    private static InputStream resource(String name) { return CsrfSessionOpenApiContractTest.class.getClassLoader().getResourceAsStream(name); }
    private static String token(ResponseEntity<String> response) { var matcher = TOKEN.matcher(response.getBody()); assertThat(matcher.find()).isTrue(); return matcher.group(1); }
    private static String cookies(ResponseEntity<String> response) { return response.getHeaders().get(HttpHeaders.SET_COOKIE).stream().map(value -> value.substring(0, value.indexOf(';'))).reduce((left, right) -> left + "; " + right).orElseThrow(); }
    private static void assertStatus(ResponseEntity<String> response, int status) { assertThat(response.getStatusCode().value()).isEqualTo(status); assertThat(response.getHeaders().getCacheControl()).contains("no-store"); assertThat(response.getHeaders().getContentType()).hasToString("application/problem+json"); }
    private static void assertResponses(Map<String, Object> operation, String... statuses) { Map<String, Object> responses = map(operation.get("responses")); for (String status : statuses) assertThat(responses).containsKey(status); }
    private static boolean hasSecurity(Map<String, Object> operation, String name) { return ((List<Map<String, Object>>) operation.get("security")).stream().anyMatch(requirement -> requirement.containsKey(name)); }
    private static void assertSecurity(Map<String, Object> operation, String... names) { List<Map<String, Object>> requirements = (List<Map<String, Object>>) operation.get("security"); assertThat(requirements).singleElement().satisfies(requirement -> assertThat(requirement).containsKeys(names)); }
    @SuppressWarnings("unchecked") private static Map<String, Object> map(Object value) { return (Map<String, Object>) value; }
}
