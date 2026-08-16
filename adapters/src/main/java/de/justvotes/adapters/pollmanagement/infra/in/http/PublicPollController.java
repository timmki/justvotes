package de.justvotes.adapters.pollmanagement.infra.in.http;

import de.justvotes.pollmanagement.core.model.Poll;
import de.justvotes.pollmanagement.core.ports.in.ViewPolls;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/polls")
public final class PublicPollController {
    private final ViewPolls polls;

    public PublicPollController(ViewPolls polls) {
        this.polls = polls;
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
}
