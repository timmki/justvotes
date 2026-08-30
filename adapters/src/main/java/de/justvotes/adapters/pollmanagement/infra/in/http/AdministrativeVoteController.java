package de.justvotes.adapters.pollmanagement.infra.in.http;

import de.justvotes.adapters.shared.infra.in.http.OpaqueIdCodec;
import de.justvotes.api.v1.model.AdminVote;
import de.justvotes.api.v1.model.AdminVotePage;
import de.justvotes.api.v1.model.AdminVotePoll;
import de.justvotes.api.v1.model.Option;
import de.justvotes.api.v1.model.VoteRemoval;
import de.justvotes.api.v1.server.AdministrationApi;
import de.justvotes.pollmanagement.core.model.Poll;
import de.justvotes.pollmanagement.core.ports.in.ManageAdminVotes;
import de.justvotes.pollmanagement.core.ports.in.ViewAdminVotes;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@RestController
public class AdministrativeVoteController implements AdministrationApi {
    private final ViewAdminVotes queries;
    private final ManageAdminVotes commands;

    public AdministrativeVoteController(ViewAdminVotes queries, ManageAdminVotes commands) {
        this.queries = queries;
        this.commands = commands;
    }

    @Override
    public ResponseEntity<AdminVotePage> adminVotes(Integer page, Integer size) {
        de.justvotes.pollmanagement.core.model.AdminVotePage result = queries.adminVotes(page, size);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(new AdminVotePage(
                result.votes().stream().map(vote -> new AdminVote(
                        OpaqueIdCodec.encode("v", vote.id()),
                        vote.identity().value(),
                        OffsetDateTime.ofInstant(vote.votedAt(), ZoneOffset.UTC),
                        new AdminVotePoll(OpaqueIdCodec.encode("p", vote.pollId().value()), vote.pollTitle()),
                        new Option(vote.optionNumber(), vote.optionText()))).toList(),
                result.page(), result.size(), Math.toIntExact(result.totalElements())));
    }

    @Override
    public ResponseEntity<Void> removeAdminVote(String voteId, VoteRemoval voteRemoval) {
        if (voteRemoval == null) {
            throw new IllegalArgumentException("A vote removal reason is required.");
        }
        commands.removeAdminVote(OpaqueIdCodec.decode("v", voteId), admin(), voteRemoval.getReason());
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }

    private static String admin() {
        var principal = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest().getUserPrincipal();
        if (principal == null) {
            throw new IllegalStateException("An administrator session is required.");
        }
        return principal.getName();
    }
}
