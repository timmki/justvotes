package de.justvotes.bootstrap;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.util.List;
import java.util.Map;
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

    private static void assertNoStore(ResponseEntity<?> response) {
        assertTrue(response.getHeaders().getCacheControl().contains("no-store"));
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
        assertNoStore(created);
        assertTrue(created.getBody().contains("\"visibility\":\"private\""));
        assertTrue(created.getBody().contains("\"state\":\"draft\""));
        assertTrue(created.getBody().indexOf("alpha") < created.getBody().indexOf("zeta"));
        String pollId = stringField(created, "id");

        ResponseEntity<String> edited = admin.put(pollsUrl + "/" + pollId + "/options", "{\"optionTexts\":[\"Ja\",\"Nein\"]}");
        assertEquals(200, edited.getStatusCode().value(), edited.getBody());
        assertNoStore(edited);
        assertTrue(edited.getBody().contains("Ja"));
        assertTrue(edited.getBody().contains("alpha"));
        assertTrue(edited.getBody().contains("zeta"));
        assertEquals(400, admin.put(pollsUrl + "/" + pollId + "/options", "{\"optionTexts\":[\" Ja \",\"ja\"]}").getStatusCode().value());
        ResponseEntity<String> adminPolls = admin.get(pollsUrl);
        assertNoStore(adminPolls);
        assertTrue(adminPolls.getBody().contains(pollId));
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
        ResponseEntity<String> missingPoll = visitor.getForEntity(publicPollsUrl + "/p_v1_missing", String.class);
        assertEquals(privatePoll.getStatusCode(), missingPoll.getStatusCode());
        assertEquals(privatePoll.getBody().replace("/" + pollId, "/p_v1_missing"), missingPoll.getBody());
        assertTrue(missingPoll.getHeaders().getCacheControl().contains("no-store"));

        ResponseEntity<String> published = admin.put(pollsUrl + "/" + pollId + "/publication", "{\"endsAt\":\"2099-01-01T00:00:00Z\"}");
        assertEquals(200, published.getStatusCode().value(), published.getBody());
        assertNoStore(published);
        assertTrue(published.getBody().contains("\"visibility\":\"public\""));
        assertTrue(published.getBody().contains("\"state\":\"active\""));
        assertTrue(visitor.getForEntity(publicPollsUrl, String.class).getBody().contains(pollId));
        ResponseEntity<String> visiblePoll = visitor.getForEntity(publicPollsUrl + "/" + pollId, String.class);
        assertEquals(200, visiblePoll.getStatusCode().value());
        assertTrue(visiblePoll.getHeaders().getCacheControl().contains("no-store"));

        ResponseEntity<String> madePrivate = admin.delete(pollsUrl + "/" + pollId + "/publication");
        assertEquals(200, madePrivate.getStatusCode().value());
        assertNoStore(madePrivate);
        ResponseEntity<String> privatizedPoll = visitor.getForEntity(publicPollsUrl + "/" + pollId, String.class);
        assertEquals(404, privatizedPoll.getStatusCode().value());
        assertTrue(privatizedPoll.getHeaders().getCacheControl().contains("no-store"));
        assertFalse(visitor.getForEntity(publicPollsUrl, String.class).getBody().contains(pollId));
    }

    @Test
    void listsPublicPollSummariesWithCurrentVoteCountsAndCreationTimes() {
        String catalogUrl = "http://localhost:" + port + "/api/v1/admin/template-catalog";
        String pollsUrl = "http://localhost:" + port + "/api/v1/admin/polls";
        String publicPollsUrl = "http://localhost:" + port + "/api/v1/polls";
        AuthenticatedAdmin admin = login();
        String firstTemplate = createdId(admin.post(catalogUrl + "/templates", "{\"name\":\"Summary-Option-A\"}"));
        String secondTemplate = createdId(admin.post(catalogUrl + "/templates", "{\"name\":\"Summary-Option-B\"}"));
        String group = createdId(admin.post(catalogUrl + "/groups", "{\"name\":\"Summary-Gruppe\",\"description\":\"\"}"));
        assertEquals(204, admin.put(catalogUrl + "/groups/" + group + "/templates/" + firstTemplate).getStatusCode().value());
        assertEquals(204, admin.put(catalogUrl + "/groups/" + group + "/templates/" + secondTemplate).getStatusCode().value());
        String firstPoll = stringField(admin.post(pollsUrl, "{\"title\":\"Erste Wahl\",\"templateGroupId\":\"" + group + "\"}"), "id");
        String secondPoll = stringField(admin.post(pollsUrl, "{\"title\":\"Zweite Wahl\",\"templateGroupId\":\"" + group + "\"}"), "id");
        admin.put(pollsUrl + "/" + firstPoll + "/publication", "{\"endsAt\":\"2099-01-01T00:00:00Z\"}");
        admin.put(pollsUrl + "/" + secondPoll + "/publication", "{\"endsAt\":\"2099-01-01T00:00:00Z\"}");

        PublicVisitor visitor = publicVisitor();
        ResponseEntity<String> identity = visitor.post("http://localhost:" + port + "/api/v1/identity", "{\"userID\":\"SummaryUser\"}");
        assertEquals(204, identity.getStatusCode().value());
        visitor = new PublicVisitor(visitor.client(), visitor.cookies() + "; userID=summaryuser", visitor.csrfToken());
        assertEquals(200, visitor.post(publicPollsUrl + "/" + firstPoll + "/votes", "{\"optionNumber\":2}").getStatusCode().value());

        ResponseEntity<String> listed = visitor.get(publicPollsUrl);

        assertEquals(200, listed.getStatusCode().value(), listed.getBody());
        assertNoStore(listed);
        assertTrue(listed.getBody().contains("\"title\":\"Erste Wahl\""));
        assertTrue(listed.getBody().contains("\"title\":\"Zweite Wahl\""));
        assertTrue(listed.getBody().contains("\"id\":\"" + firstPoll + "\""));
        assertTrue(listed.getBody().contains("\"visibility\":\"public\""));
        assertTrue(listed.getBody().contains("\"state\":\"active\""));
        assertTrue(listed.getBody().contains("\"endsAt\":\"2099-01-01T00:00:00Z\""));
        assertTrue(listed.getBody().contains("\"totalVotes\":1"));
        assertTrue(listed.getBody().contains("\"totalVotes\":0"));
        assertTrue(Pattern.compile("\\\"createdAt\\\":\\\"[^\\\"]+Z\\\"").matcher(listed.getBody()).find());
        assertTrue(listed.getBody().indexOf("\"title\":\"Erste Wahl\"") < listed.getBody().indexOf("\"title\":\"Zweite Wahl\""));
        assertFalse(listed.getBody().contains("createdBy"));
        assertFalse(listed.getBody().contains("systemadmin"));

        assertEquals(1, totalVotes(listed, firstPoll));
        assertEquals(0, totalVotes(listed, secondPoll));
        assertEquals(200, visitor.post(publicPollsUrl + "/" + firstPoll + "/votes", "{\"optionNumber\":1}").getStatusCode().value());
        assertEquals(1, totalVotes(visitor.get(publicPollsUrl), firstPoll));

        ResponseEntity<String> changedIdentity = visitor.post("http://localhost:" + port + "/api/v1/identity", "{\"userID\":\"AnotherUser\"}");
        assertEquals(204, changedIdentity.getStatusCode().value());
        visitor = new PublicVisitor(visitor.client(), visitor.cookies() + "; userID=anotheruser", visitor.csrfToken());
        assertEquals(0, totalVotes(visitor.get(publicPollsUrl), firstPoll));

        assertEquals(200, admin.delete(pollsUrl + "/" + firstPoll + "/publication").getStatusCode().value());
        assertFalse(visitor.get(publicPollsUrl).getBody().contains("\"id\":\"" + firstPoll + "\""));
    }

    @Test
    void withdrawsOnlyTheCookieIdentityAndUpdatesResultsAndAuditIdempotently() {
        String catalogUrl = "http://localhost:" + port + "/api/v1/admin/template-catalog";
        String pollsUrl = "http://localhost:" + port + "/api/v1/admin/polls";
        String publicPollsUrl = "http://localhost:" + port + "/api/v1/polls";
        AuthenticatedAdmin admin = login();
        String firstTemplate = createdId(admin.post(catalogUrl + "/templates", "{\"name\":\"Withdrawal-Ja\"}"));
        String secondTemplate = createdId(admin.post(catalogUrl + "/templates", "{\"name\":\"Withdrawal-Nein\"}"));
        String group = createdId(admin.post(catalogUrl + "/groups", "{\"name\":\"Withdrawal\",\"description\":\"\"}"));
        admin.put(catalogUrl + "/groups/" + group + "/templates/" + firstTemplate);
        admin.put(catalogUrl + "/groups/" + group + "/templates/" + secondTemplate);
        String pollId = stringField(admin.post(pollsUrl, "{\"title\":\"Withdrawal\",\"templateGroupId\":\"" + group + "\"}"), "id");
        admin.put(pollsUrl + "/" + pollId + "/publication", "{\"endsAt\":\"2099-01-01T00:00:00Z\"}");

        PublicVisitor alice = publicVisitor();
        ResponseEntity<String> aliceIdentity = alice.post("http://localhost:" + port + "/api/v1/identity", "{\"userID\":\"Alice\"}");
        assertEquals(204, aliceIdentity.getStatusCode().value());
        alice = new PublicVisitor(alice.client(), alice.cookies() + "; userID=alice", alice.csrfToken());
        PublicVisitor bob = publicVisitor();
        ResponseEntity<String> bobIdentity = bob.post("http://localhost:" + port + "/api/v1/identity", "{\"userID\":\"Bob\"}");
        assertEquals(204, bobIdentity.getStatusCode().value());
        bob = new PublicVisitor(bob.client(), bob.cookies() + "; userID=bob", bob.csrfToken());

        assertEquals(200, alice.post(publicPollsUrl + "/" + pollId + "/votes", "{\"optionNumber\":1}").getStatusCode().value());
        assertEquals(200, bob.post(publicPollsUrl + "/" + pollId + "/votes", "{\"optionNumber\":2}").getStatusCode().value());

        ResponseEntity<String> csrfRejected = alice.deleteWithoutCsrf(publicPollsUrl + "/" + pollId + "/votes");
        assertEquals(403, csrfRejected.getStatusCode().value());
        assertNoStore(csrfRejected);
        ResponseEntity<String> withdrawn = alice.delete(publicPollsUrl + "/" + pollId + "/votes");
        assertEquals(204, withdrawn.getStatusCode().value());
        assertNoStore(withdrawn);
        ResponseEntity<String> repeated = alice.delete(publicPollsUrl + "/" + pollId + "/votes");
        assertEquals(204, repeated.getStatusCode().value());
        assertNoStore(repeated);

        ResponseEntity<String> results = bob.get(publicPollsUrl + "/" + pollId + "/results");
        assertEquals(200, results.getStatusCode().value(), results.getBody());
        assertTrue(results.getBody().contains("\"totalVotes\":1"));
        assertTrue(results.getBody().contains("\"userID\":\"bob\""));
        assertFalse(results.getBody().contains("\"userID\":\"alice\""));

        ResponseEntity<String> audit = alice.get(publicPollsUrl + "/" + pollId + "/audit");
        assertEquals(200, audit.getStatusCode().value(), audit.getBody());
        assertEquals(1, occurrences(audit.getBody(), "VoteWithdrawn"));
        assertTrue(audit.getBody().contains("\"actor\":\"alice\""));
        assertTrue(audit.getBody().contains("\"selection\":\"withdrawal-ja\""));
        assertTrue(audit.getBody().contains("\"occurredAt\":\""));
    }

    @Test
    void rejectsWithdrawalForPrivateUnknownAndNonActivePolls() {
        String catalogUrl = "http://localhost:" + port + "/api/v1/admin/template-catalog";
        String pollsUrl = "http://localhost:" + port + "/api/v1/admin/polls";
        String publicPollsUrl = "http://localhost:" + port + "/api/v1/polls";
        AuthenticatedAdmin admin = login();
        String template = createdId(admin.post(catalogUrl + "/templates", "{\"name\":\"Withdrawal-State-Option\"}"));
        String group = createdId(admin.post(catalogUrl + "/groups", "{\"name\":\"Withdrawal-State-Group\",\"description\":\"\"}"));
        admin.put(catalogUrl + "/groups/" + group + "/templates/" + template);
        PublicVisitor visitor = publicVisitor();
        PublicVisitor anonymous = publicVisitor();
        ResponseEntity<String> identity = visitor.post("http://localhost:" + port + "/api/v1/identity", "{\"userID\":\"StateUser\"}");
        assertEquals(204, identity.getStatusCode().value());
        visitor = new PublicVisitor(visitor.client(), visitor.cookies() + "; userID=stateuser", visitor.csrfToken());

        String privatePoll = stringField(admin.post(pollsUrl, "{\"title\":\"Privat\",\"templateGroupId\":\"" + group + "\"}"), "id");
        assertEquals(404, visitor.delete(publicPollsUrl + "/" + privatePoll + "/votes").getStatusCode().value());
        assertEquals(404, anonymous.delete(publicPollsUrl + "/" + privatePoll + "/votes").getStatusCode().value());
        assertEquals(404, visitor.delete(publicPollsUrl + "/p_v1_missing/votes").getStatusCode().value());
        assertEquals(404, anonymous.delete(publicPollsUrl + "/p_v1_missing/votes").getStatusCode().value());

        String expiredPoll = stringField(admin.post(pollsUrl, "{\"title\":\"Abgelaufen\",\"templateGroupId\":\"" + group + "\"}"), "id");
        admin.put(pollsUrl + "/" + expiredPoll + "/publication", "{\"endsAt\":\"2000-01-01T00:00:00Z\"}");
        ResponseEntity<String> expired = visitor.delete(publicPollsUrl + "/" + expiredPoll + "/votes");
        assertEquals(409, expired.getStatusCode().value(), expired.getBody());
        assertTrue(expired.getBody().contains("poll-not-active"));
        assertEquals(409, anonymous.delete(publicPollsUrl + "/" + expiredPoll + "/votes").getStatusCode().value());

        String archivedPoll = stringField(admin.post(pollsUrl, "{\"title\":\"Archiviert\",\"templateGroupId\":\"" + group + "\"}"), "id");
        admin.put(pollsUrl + "/" + archivedPoll + "/publication", "{\"endsAt\":\"2099-01-01T00:00:00Z\"}");
        admin.put(pollsUrl + "/" + archivedPoll + "/archive");
        ResponseEntity<String> archived = visitor.delete(publicPollsUrl + "/" + archivedPoll + "/votes");
        assertEquals(409, archived.getStatusCode().value(), archived.getBody());

        String deletedPoll = stringField(admin.post(pollsUrl, "{\"title\":\"Geloescht\",\"templateGroupId\":\"" + group + "\"}"), "id");
        admin.put(pollsUrl + "/" + deletedPoll + "/publication", "{\"endsAt\":\"2099-01-01T00:00:00Z\"}");
        admin.delete(pollsUrl + "/" + deletedPoll);
        ResponseEntity<String> deleted = visitor.delete(publicPollsUrl + "/" + deletedPoll + "/votes");
        assertEquals(409, deleted.getStatusCode().value(), deleted.getBody());
    }

    private static int occurrences(String text, String value) {
        return text.split(Pattern.quote(value), -1).length - 1;
    }

    private static int totalVotes(ResponseEntity<String> response, String pollId) {
        try {
            return ((Number) new ObjectMapper().readValue(response.getBody(), new TypeReference<List<Map<String, Object>>>() {
            }).stream().filter(poll -> pollId.equals(poll.get("id"))).findFirst().orElseThrow().get("totalVotes")).intValue();
        } catch (Exception exception) {
            throw new AssertionError("Missing poll summary " + pollId + " in " + response.getBody(), exception);
        }
    }

    @Test
    void keepsTheTemplateGroupSnapshotAfterTheSourceGroupIsRenamedAndDeleted() {
        String catalogUrl = "http://localhost:" + port + "/api/v1/admin/template-catalog";
        String pollsUrl = "http://localhost:" + port + "/api/v1/admin/polls";
        String publicPollsUrl = "http://localhost:" + port + "/api/v1/polls";
        AuthenticatedAdmin admin = login();
        String template = createdId(admin.post(catalogUrl + "/templates", "{\"name\":\"Snapshot-Option\"}"));
        String group = createdId(admin.post(catalogUrl + "/groups", "{\"name\":\"Ursprungsgruppe\",\"description\":\"Historischer Gruppenhinweis\"}"));
        assertEquals(204, admin.put(catalogUrl + "/groups/" + group + "/templates/" + template).getStatusCode().value());

        ResponseEntity<String> created = admin.post(pollsUrl, "{\"title\":\"Snapshot-Test\",\"templateGroupId\":\"" + group + "\"}");
        String pollId = stringField(created, "id");
        ResponseEntity<String> published = admin.put(pollsUrl + "/" + pollId + "/publication", "{\"endsAt\":\"2099-01-01T00:00:00Z\"}");
        assertTrue(published.getBody().contains("\"name\":\"ursprungsgruppe\""));
        assertTrue(published.getBody().contains("\"description\":\"Historischer Gruppenhinweis\""));

        assertEquals(200, admin.patch(catalogUrl + "/groups/" + group, "{\"name\":\"Neue Gruppe\"}").getStatusCode().value());
        assertEquals(204, admin.delete(catalogUrl + "/groups/" + group).getStatusCode().value());

        ResponseEntity<String> loaded = new TestRestTemplate().getForEntity(publicPollsUrl + "/" + pollId, String.class);
        assertEquals(200, loaded.getStatusCode().value(), loaded.getBody());
        assertTrue(loaded.getBody().contains("\"name\":\"ursprungsgruppe\""));
        assertTrue(loaded.getBody().contains("\"description\":\"Historischer Gruppenhinweis\""));
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
        assertTrue(identity.getHeaders().getCacheControl().contains("no-store"));
        assertTrue(identity.getHeaders().get(HttpHeaders.SET_COOKIE).stream().anyMatch(cookie -> cookie.startsWith("userID=alice_1;")));
        visitor = new PublicVisitor(visitor.client(), visitor.cookies() + "; userID=alice_1", visitor.csrfToken());

        ResponseEntity<String> csrfRejectedVote = visitor.postWithoutCsrf(publicPollsUrl + "/" + pollId + "/votes", "{\"optionNumber\":1}");
        assertEquals(403, csrfRejectedVote.getStatusCode().value());
        assertNoStore(csrfRejectedVote);

        ResponseEntity<String> created = visitor.post(publicPollsUrl + "/" + pollId + "/votes", "{\"optionNumber\":1}");
        assertEquals(200, created.getStatusCode().value(), created.getBody());
        assertTrue(created.getHeaders().getCacheControl().contains("no-store"));
        assertTrue(created.getBody().contains("\"status\":\"created\""));
        ResponseEntity<String> unchanged = visitor.post(publicPollsUrl + "/" + pollId + "/votes", "{\"optionNumber\":1}");
        assertEquals(200, unchanged.getStatusCode().value(), unchanged.getBody());
        assertTrue(unchanged.getHeaders().getCacheControl().contains("no-store"));
        assertTrue(unchanged.getBody().contains("\"status\":\"unchanged\""));
        ResponseEntity<String> replaced = visitor.post(publicPollsUrl + "/" + pollId + "/votes", "{\"optionNumber\":2}");
        assertEquals(200, replaced.getStatusCode().value(), replaced.getBody());
        assertTrue(replaced.getHeaders().getCacheControl().contains("no-store"));
        assertTrue(replaced.getBody().contains("\"status\":\"replaced\""));

        ResponseEntity<String> audit = visitor.get(publicPollsUrl + "/" + pollId + "/audit");
        assertEquals(200, audit.getStatusCode().value(), audit.getBody());
        assertTrue(audit.getHeaders().getCacheControl().contains("no-store"));
        assertTrue(audit.getBody().contains("alice_1"));
        assertTrue(audit.getBody().contains("VoteCast"));
        assertTrue(audit.getBody().contains("VoteReplaced"));
        assertTrue(
                audit.getBody().contains("\"selection\":\"ja\"")
                        || audit.getBody().contains("\"selection\":\"nein\""),
                audit.getBody()
        );
    }

    @Test
    void exposesCurrentResultsWithCountsAndVoterTimestampsAfterVoteChanges() {
        String catalogUrl = "http://localhost:" + port + "/api/v1/admin/template-catalog";
        String pollsUrl = "http://localhost:" + port + "/api/v1/admin/polls";
        String resultsUrl = "http://localhost:" + port + "/api/v1/polls";
        AuthenticatedAdmin admin = login();
        String yes = createdId(admin.post(catalogUrl + "/templates", "{\"name\":\"Ergebnis-Ja\"}"));
        String no = createdId(admin.post(catalogUrl + "/templates", "{\"name\":\"Ergebnis-Nein\"}"));
        String group = createdId(admin.post(catalogUrl + "/groups", "{\"name\":\"Ergebnis\",\"description\":\"\"}"));
        admin.put(catalogUrl + "/groups/" + group + "/templates/" + yes);
        admin.put(catalogUrl + "/groups/" + group + "/templates/" + no);
        String pollId = stringField(admin.post(pollsUrl, "{\"title\":\"Ergebnis\",\"templateGroupId\":\"" + group + "\"}"), "id");
        admin.put(pollsUrl + "/" + pollId + "/publication", "{\"endsAt\":\"2099-01-01T00:00:00Z\"}");

        PublicVisitor alice = publicVisitor();
        assertEquals(403, alice.get(resultsUrl + "/" + pollId + "/results").getStatusCode().value());
        ResponseEntity<String> aliceIdentity = alice.post("http://localhost:" + port + "/api/v1/identity", "{\"userID\":\"Alice\"}");
        assertEquals(204, aliceIdentity.getStatusCode().value());
        alice = new PublicVisitor(alice.client(), alice.cookies() + "; userID=alice", alice.csrfToken());
        assertEquals(403, alice.get(resultsUrl + "/" + pollId + "/results").getStatusCode().value());

        assertEquals(200, alice.post(resultsUrl + "/" + pollId + "/votes", "{\"optionNumber\":1}").getStatusCode().value());
        ResponseEntity<String> firstResults = alice.get(resultsUrl + "/" + pollId + "/results");
        assertResultResponse(firstResults, 200);
        assertTrue(firstResults.getBody().contains("\"totalVotes\":1"));
        assertTrue(firstResults.getBody().contains("\"number\":1,\"text\":\"ergebnis-ja\",\"voteCount\":1"), firstResults.getBody());
        assertTrue(firstResults.getBody().contains("\"number\":2,\"text\":\"ergebnis-nein\",\"voteCount\":0"));
        assertTrue(firstResults.getBody().contains("\"userID\":\"alice\""));
        assertTrue(firstResults.getBody().contains("\"votedAt\":"));
        assertFalse(firstResults.getBody().contains("currentVote"));

        assertEquals(200, alice.post(resultsUrl + "/" + pollId + "/votes", "{\"optionNumber\":2}").getStatusCode().value());
        PublicVisitor bob = publicVisitor();
        ResponseEntity<String> bobIdentity = bob.post("http://localhost:" + port + "/api/v1/identity", "{\"userID\":\"Bob\"}");
        assertEquals(204, bobIdentity.getStatusCode().value());
        bob = new PublicVisitor(bob.client(), bob.cookies() + "; userID=bob", bob.csrfToken());
        assertEquals(200, bob.post(resultsUrl + "/" + pollId + "/votes", "{\"optionNumber\":1}").getStatusCode().value());

        ResponseEntity<String> tiedResults = alice.get(resultsUrl + "/" + pollId + "/results");
        assertResultResponse(tiedResults, 200);
        assertTrue(tiedResults.getBody().contains("\"totalVotes\":2"));
        assertTrue(tiedResults.getBody().contains("\"number\":1,\"text\":\"ergebnis-ja\",\"voteCount\":1"));
        assertTrue(tiedResults.getBody().contains("\"number\":2,\"text\":\"ergebnis-nein\",\"voteCount\":1"));
        assertTrue(tiedResults.getBody().contains("\"votes\":[{\"userID\":\"bob\""));

        ResponseEntity<String> changedIdentity = alice.post("http://localhost:" + port + "/api/v1/identity", "{\"userID\":\"Charlie\"}");
        assertEquals(204, changedIdentity.getStatusCode().value());
        alice = new PublicVisitor(alice.client(), alice.cookies() + "; userID=charlie", alice.csrfToken());
        ResponseEntity<String> afterRemoval = bob.get(resultsUrl + "/" + pollId + "/results");
        assertResultResponse(afterRemoval, 200);
        assertTrue(afterRemoval.getBody().contains("\"totalVotes\":1"));
        assertTrue(afterRemoval.getBody().contains("\"number\":1,\"text\":\"ergebnis-ja\",\"voteCount\":1"));
        assertTrue(afterRemoval.getBody().contains("\"userID\":\"bob\""));
        assertFalse(afterRemoval.getBody().contains("\"userID\":\"alice\""));
    }

    @Test
    void exposesExpiredResultsAndHidesPrivateAndUnknownPolls() {
        String catalogUrl = "http://localhost:" + port + "/api/v1/admin/template-catalog";
        String pollsUrl = "http://localhost:" + port + "/api/v1/admin/polls";
        String resultsUrl = "http://localhost:" + port + "/api/v1/polls";
        AuthenticatedAdmin admin = login();
        String template = createdId(admin.post(catalogUrl + "/templates", "{\"name\":\"Ablauf\"}"));
        String group = createdId(admin.post(catalogUrl + "/groups", "{\"name\":\"Ablaufgruppe\",\"description\":\"\"}"));
        admin.put(catalogUrl + "/groups/" + group + "/templates/" + template);
        String expiredPoll = stringField(admin.post(pollsUrl, "{\"title\":\"Abgelaufen\",\"templateGroupId\":\"" + group + "\"}"), "id");
        admin.put(pollsUrl + "/" + expiredPoll + "/publication", "{\"endsAt\":\"2000-01-01T00:00:00Z\"}");
        String privatePoll = stringField(admin.post(pollsUrl, "{\"title\":\"Privat\",\"templateGroupId\":\"" + group + "\"}"), "id");
        PublicVisitor visitor = publicVisitor();

        ResponseEntity<String> expired = visitor.get(resultsUrl + "/" + expiredPoll + "/results");
        assertResultResponse(expired, 200);
        assertTrue(expired.getBody().contains("\"state\":\"expired\""));
        assertTrue(expired.getBody().contains("\"totalVotes\":0"));

        ResponseEntity<String> privateResults = visitor.get(resultsUrl + "/" + privatePoll + "/results");
        ResponseEntity<String> unknownResults = visitor.get(resultsUrl + "/p_v1_missing/results");
        assertResultResponse(privateResults, 404);
        assertResultResponse(unknownResults, 404);
        assertEquals(privateResults.getBody().replace("/" + privatePoll, "/p_v1_missing"), unknownResults.getBody());
    }

    private static void assertResultResponse(ResponseEntity<String> response, int status) {
        assertEquals(status, response.getStatusCode().value(), response.getBody());
        assertTrue(response.getHeaders().getCacheControl().contains("no-store"));
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

    private record PublicVisitor(TestRestTemplate client, String cookies, String csrfToken) {
        ResponseEntity<String> get(String url) {
            return client.exchange(RequestEntity.get(url).header(HttpHeaders.COOKIE, cookies).build(), String.class);
        }

        ResponseEntity<String> post(String url, String body) {
            return client.exchange(RequestEntity.post(url).contentType(MediaType.APPLICATION_JSON)
                    .header(HttpHeaders.COOKIE, cookies).header("X-XSRF-TOKEN", csrfToken).body(body), String.class);
        }

        ResponseEntity<String> postWithoutCsrf(String url, String body) {
            return client.exchange(RequestEntity.post(url).contentType(MediaType.APPLICATION_JSON)
                    .header(HttpHeaders.COOKIE, cookies).body(body), String.class);
        }

        ResponseEntity<String> delete(String url) {
            return client.exchange(RequestEntity.delete(url).header(HttpHeaders.COOKIE, cookies)
                    .header("X-XSRF-TOKEN", csrfToken).build(), String.class);
        }

        ResponseEntity<String> deleteWithoutCsrf(String url) {
            return client.exchange(RequestEntity.delete(url).header(HttpHeaders.COOKIE, cookies).build(), String.class);
        }
    }
}
