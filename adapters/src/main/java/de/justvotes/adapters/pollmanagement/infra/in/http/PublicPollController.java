package de.justvotes.adapters.pollmanagement.infra.in.http;

import de.justvotes.adapters.shared.infra.in.http.OpaqueIdCodec;
import de.justvotes.api.v1.model.*;
import de.justvotes.api.v1.model.Poll;
import de.justvotes.api.v1.model.PollState;
import de.justvotes.api.v1.model.PollVisibility;
import de.justvotes.api.v1.server.PublicPollsApi;
import de.justvotes.pollmanagement.core.model.Identity;
import de.justvotes.pollmanagement.core.model.Poll.PollId;
import de.justvotes.pollmanagement.core.model.PollResults;
import de.justvotes.pollmanagement.core.model.VoteOutcome;
import de.justvotes.pollmanagement.core.ports.in.ManageVotes;
import de.justvotes.pollmanagement.core.ports.in.ViewPolls;
import de.justvotes.pollmanagement.core.ports.in.ViewVotes;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.OffsetDateTime;
import java.util.List;

@RestController
public class PublicPollController implements PublicPollsApi {
    private final ViewPolls polls;
    private final ManageVotes votes;
    private final ViewVotes voteQueries;

    public PublicPollController(ViewPolls polls, ManageVotes votes, ViewVotes voteQueries) {
        this.polls = polls;
        this.votes = votes;
        this.voteQueries = voteQueries;
    }

    private static <T> ResponseEntity<T> noStore(T body) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body);
    }

    private static PollId pollId(String value) {
        return PollId.of(OpaqueIdCodec.decodeString("p", value));
    }

    private static Identity identity() {
        Identity identity = currentIdentity();
        if (identity != null) return identity;
        throw new IllegalArgumentException("An identity must be set before voting.");
    }

    private static Identity currentIdentity() {
        HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if (IdentityCookieCodec.NAME.equals(cookie.getName())) {
                    try {
                        return IdentityCookieCodec.decode(cookie.getValue());
                    } catch (IllegalArgumentException exception) {
                        return null;
                    }
                }
            }
        }
        return null;
    }

    private static de.justvotes.api.v1.model.PollResults mapResults(PollResults results) {
        OffsetDateTime endsAt = null;
        if (results.endsAt() != null) {
            endsAt = PollResponseMapper.utcTimestamp(results.endsAt());
        }
        return new de.justvotes.api.v1.model.PollResults(
                OpaqueIdCodec.encode("p", results.id().value()),
                results.title(),
                PollVisibility.valueOf(results.visibility().name()),
                PollState.valueOf(results.state().name()),
                PollResponseMapper.utcTimestamp(results.createdAt()),
                endsAt,
                results.totalVotes(),
                results.options().stream().map(option -> new ResultOption(
                        option.number(),
                        option.text(),
                        option.voteCount(),
                        option.votes().stream().map(vote -> new ResultVote(
                                vote.identity().value(),
                                PollResponseMapper.utcTimestamp(vote.votedAt()))).toList())).toList());
    }

    @Override
    public ResponseEntity<List<Poll>> publicPolls() {
        return noStore(polls.publicPolls().stream().map(PollResponseMapper::map).toList());
    }

    @Override
    public ResponseEntity<Poll> publicPoll(String pollId) {
        return noStore(PollResponseMapper.map(polls.publicPoll(pollId(pollId))));
    }

    @Override
    public ResponseEntity<Vote> castVote(String pollId, VoteInput request) {
        VoteOutcome outcome = votes.castOrReplace(pollId(pollId), identity(), request.getOptionNumber());
        return noStore(new Vote(VoteStatus.valueOf(outcome.status().name()), outcome.vote().optionNumber()));
    }

    @Override
    public ResponseEntity<Void> withdrawVote(String pollId) {
        votes.withdrawVote(pollId(pollId), currentIdentity());
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }

    @Override
    public ResponseEntity<de.justvotes.api.v1.model.PollResults> pollResults(String pollId) {
        return noStore(mapResults(voteQueries.results(pollId(pollId), currentIdentity())));
    }

    @Override
    public ResponseEntity<List<AuditEntry>> pollAudit(String pollId) {
        return noStore(voteQueries.publicAudit(pollId(pollId)).stream()
                .map(entry -> {
                    OffsetDateTime votedAt = null;
                    if (entry.votedAt() != null) {
                        votedAt = PollResponseMapper.utcTimestamp(entry.votedAt());
                    }
                    return new AuditEntry()
                            .event(AuditEventType.fromValue(entry.event()))
                            .actor(entry.actor())
                            .occurredAt(PollResponseMapper.utcTimestamp(entry.occurredAt()))
                            .selection(entry.selection())
                            .reason(entry.reason())
                            .userID(entry.voteIdentity())
                            .optionNumber(entry.optionNumber())
                            .votedAt(votedAt);
                }).toList());
    }
}
