package de.justvotes.adapters.pollmanagement.infra.in.http;

import de.justvotes.pollmanagement.core.exception.PollNotFoundException;
import de.justvotes.pollmanagement.core.model.Identity;
import de.justvotes.pollmanagement.core.model.Poll;
import de.justvotes.pollmanagement.core.model.VoteOutcome;
import de.justvotes.pollmanagement.core.ports.in.ManageVotes;
import de.justvotes.pollmanagement.core.ports.in.ViewPolls;
import de.justvotes.pollmanagement.core.ports.in.ViewVotes;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/polls")
public final class PublicPollController {
    private final ViewPolls polls;
    private final ManageVotes votes;
    private final ViewVotes voteQueries;

    public PublicPollController(ViewPolls polls, ManageVotes votes, ViewVotes voteQueries) {
        this.polls = polls;
        this.votes = votes;
        this.voteQueries = voteQueries;
    }

    @GetMapping
    public ResponseEntity<List<PollController.PollResponse>> list() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(polls.publicPolls().stream().map(PollController.PollResponse::from).toList());
    }

    @GetMapping("/{pollId}")
    public ResponseEntity<PollController.PollResponse> detail(@PathVariable("pollId") String pollId) {
        try {
            return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                    .body(PollController.PollResponse.from(polls.publicPoll(Poll.PollId.of(pollId))));
        } catch (RuntimeException exception) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).cacheControl(CacheControl.noStore()).build();
        }
    }

    @PostMapping("/{pollId}/votes")
    public ResponseEntity<VoteResponse> cast(@PathVariable("pollId") String pollId, @RequestBody VoteRequest request, HttpServletRequest servletRequest) {
        try {
            VoteOutcome outcome = votes.castOrReplace(Poll.PollId.of(pollId), identity(servletRequest), request.optionNumber());
            return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(VoteResponse.from(outcome));
        } catch (PollNotFoundException exception) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).cacheControl(CacheControl.noStore()).build();
        }
    }

    @GetMapping("/{pollId}/audit")
    public ResponseEntity<List<AuditResponse>> audit(@PathVariable("pollId") String pollId) {
        try {
            return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(voteQueries.publicAudit(Poll.PollId.of(pollId)).stream().map(entry -> new AuditResponse(entry.actor(), entry.occurredAt(), entry.event(), entry.selection())).toList());
        } catch (PollNotFoundException exception) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).cacheControl(CacheControl.noStore()).build();
        }
    }

    private Identity identity(HttpServletRequest request) {
        if (request.getCookies() != null) for (var cookie : request.getCookies())
            if ("userID".equals(cookie.getName())) return Identity.of(cookie.getValue());
        throw new IllegalArgumentException("An identity must be set before voting.");
    }

    public record VoteRequest(int optionNumber) {
    }

    public record VoteResponse(String status, int optionNumber) {
        static VoteResponse from(VoteOutcome outcome) {
            return new VoteResponse(outcome.status().name().toLowerCase(), outcome.vote().optionNumber());
        }
    }

    public record AuditResponse(String actor, java.time.Instant occurredAt, String event, String selection) {
    }
}
