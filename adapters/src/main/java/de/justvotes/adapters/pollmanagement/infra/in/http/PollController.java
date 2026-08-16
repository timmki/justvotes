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
    public PollResponse publish(@PathVariable("pollId") String pollId, @RequestBody ExpiryRequest request, Principal admin) {
        return PollResponse.from(commands.publish(Poll.PollId.of(pollId), admin.getName(), request.endsAt()));
    }

    @DeleteMapping("/{pollId}/publication")
    public PollResponse makePrivate(@PathVariable("pollId") String pollId) {
        return PollResponse.from(commands.makePrivate(Poll.PollId.of(pollId)));
    }

    @GetMapping
    public List<PollResponse> drafts(Principal admin) {
        return queries.pollsCreatedBy(admin.getName()).stream().map(PollResponse::from).toList();
    }

    @PutMapping("/{pollId}/archive") public PollResponse archive(@PathVariable String pollId, Principal admin) { return PollResponse.from(commands.archive(Poll.PollId.of(pollId), admin.getName())); }
    @PutMapping("/{pollId}/restore-from-archive") public PollResponse restoreFromArchive(@PathVariable String pollId, Principal admin) { return PollResponse.from(commands.restoreFromArchive(Poll.PollId.of(pollId), admin.getName())); }
    @PutMapping("/{pollId}/expiry") public PollResponse changeExpiry(@PathVariable String pollId, @RequestBody ExpiryRequest request, Principal admin) { return PollResponse.from(commands.changeExpiry(Poll.PollId.of(pollId), request.endsAt(), admin.getName())); }
    @PutMapping("/{pollId}/reopen") public PollResponse reopen(@PathVariable String pollId, Principal admin) { return PollResponse.from(commands.reopen(Poll.PollId.of(pollId), java.time.Instant.now(), admin.getName())); }
    @DeleteMapping("/{pollId}") public PollResponse softDelete(@PathVariable String pollId, Principal admin) { return PollResponse.from(commands.softDelete(Poll.PollId.of(pollId), admin.getName())); }
    @PutMapping("/{pollId}/restore") public PollResponse restore(@PathVariable String pollId, Principal admin) { return PollResponse.from(commands.restore(Poll.PollId.of(pollId), admin.getName())); }
    @DeleteMapping("/{pollId}/permanently") @ResponseStatus(HttpStatus.NO_CONTENT) public void permanentlyDelete(@PathVariable String pollId, @RequestParam boolean confirmed, @RequestParam boolean confirmationRepeated) { commands.permanentlyDelete(Poll.PollId.of(pollId), confirmed, confirmationRepeated); }

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

    public record ExpiryRequest(java.time.Instant endsAt) {
    }

    public record PollResponse(String id, String title, String visibility, String state, java.time.Instant endsAt,
                               TemplateGroupResponse templateGroup, List<OptionResponse> templateSnapshotOptions,
                               List<OptionResponse> options) {
        static PollResponse from(Poll poll) {
            return new PollResponse(poll.id().value(), poll.title(), poll.visibility().name().toLowerCase(), poll.state().name().toLowerCase(), poll.endsAt(), new TemplateGroupResponse(poll.templateGroup().id().value(), poll.templateGroup().name()), poll.templateSnapshotOptions().stream().map(option -> new OptionResponse(option.number(), option.text())).toList(), poll.options().stream().map(option -> new OptionResponse(option.number(), option.text())).toList());
        }
    }

    public record TemplateGroupResponse(long id, String name) {
    }

    public record OptionResponse(int number, String text) {
    }
}
