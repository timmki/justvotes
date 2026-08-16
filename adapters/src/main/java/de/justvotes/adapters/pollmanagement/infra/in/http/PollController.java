package de.justvotes.adapters.pollmanagement.infra.in.http;

import de.justvotes.pollmanagement.core.exception.PollNotFoundException;
import de.justvotes.pollmanagement.core.model.Poll;
import de.justvotes.pollmanagement.core.ports.in.ManagePolls;
import de.justvotes.pollmanagement.core.ports.in.ViewPolls;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/polls")
public final class PollController {
    private final ManagePolls commands;
    private final ViewPolls queries;

    public PollController(ManagePolls commands, ViewPolls queries) {
        this.commands = commands;
        this.queries = queries;
    }

    @PostMapping
    public ResponseEntity<PollResponse> createDraft(@RequestBody CreatePollRequest request, Principal admin) {
        return ResponseEntity.status(HttpStatus.CREATED).body(PollResponse.from(commands.createDraft(request.title(), Poll.TemplateGroupId.of(request.templateGroupId()), admin.getName())));
    }

    @PutMapping("/{pollId}/options")
    public PollResponse replaceOptions(@PathVariable("pollId") String pollId, @RequestBody OptionsRequest request) {
        return PollResponse.from(commands.replaceDraftOptions(Poll.PollId.of(pollId), request.optionTexts()));
    }

    @PutMapping("/{pollId}/publication")
    public PollResponse publish(@PathVariable("pollId") String pollId, Principal admin) {
        return PollResponse.from(commands.publish(Poll.PollId.of(pollId), admin.getName()));
    }

    @DeleteMapping("/{pollId}/publication")
    public PollResponse makePrivate(@PathVariable("pollId") String pollId) {
        return PollResponse.from(commands.makePrivate(Poll.PollId.of(pollId)));
    }

    @GetMapping
    public List<PollResponse> drafts(Principal admin) {
        return queries.draftsCreatedBy(admin.getName()).stream().map(PollResponse::from).toList();
    }

    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class})
    ResponseEntity<String> invalidPollChange(RuntimeException exception) {
        return ResponseEntity.badRequest().body(exception.getMessage());
    }

    @ExceptionHandler(PollNotFoundException.class)
    ResponseEntity<String> missingPoll(PollNotFoundException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(exception.getMessage());
    }

    public record CreatePollRequest(String title, long templateGroupId) {
    }

    public record OptionsRequest(List<String> optionTexts) {
    }

    public record PollResponse(String id, String title, String visibility, String state,
                               TemplateGroupResponse templateGroup, List<OptionResponse> templateSnapshotOptions,
                               List<OptionResponse> options) {
        static PollResponse from(Poll poll) {
            return new PollResponse(poll.id().value(), poll.title(), poll.visibility().name().toLowerCase(), poll.state().name().toLowerCase(), new TemplateGroupResponse(poll.templateGroup().id().value(), poll.templateGroup().name()), poll.templateSnapshotOptions().stream().map(option -> new OptionResponse(option.number(), option.text())).toList(), poll.options().stream().map(option -> new OptionResponse(option.number(), option.text())).toList());
        }
    }

    public record TemplateGroupResponse(long id, String name) {
    }

    public record OptionResponse(int number, String text) {
    }
}
