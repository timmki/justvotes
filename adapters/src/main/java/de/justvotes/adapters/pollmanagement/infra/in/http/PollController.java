package de.justvotes.adapters.pollmanagement.infra.in.http;

import de.justvotes.adapters.shared.infra.in.http.OpaqueIdCodec;
import de.justvotes.api.v1.model.CreatePoll;
import de.justvotes.api.v1.model.DeleteConfirmation;
import de.justvotes.api.v1.model.Expiry;
import de.justvotes.api.v1.model.Options;
import de.justvotes.api.v1.server.PollsApi;
import de.justvotes.pollmanagement.core.model.Poll;
import de.justvotes.pollmanagement.core.ports.in.ManagePolls;
import de.justvotes.pollmanagement.core.ports.in.ViewPolls;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.List;

@RestController
public class PollController implements PollsApi {
    private final ManagePolls commands;
    private final ViewPolls queries;

    public PollController(ManagePolls commands, ViewPolls queries) {
        this.commands = commands;
        this.queries = queries;
    }

    private static Poll.PollId pollId(String value) {
        return Poll.PollId.of(OpaqueIdCodec.decodeString("p", value));
    }

    private static java.time.Instant instant(OffsetDateTime value) {
        return value.toInstant();
    }

    private static String admin() {
        var principal = ((org.springframework.web.context.request.ServletRequestAttributes) org.springframework.web.context.request.RequestContextHolder.currentRequestAttributes()).getRequest().getUserPrincipal();
        if (principal == null) {
            throw new IllegalStateException("An administrator session is required.");
        }
        return principal.getName();
    }

    @Override
    public ResponseEntity<de.justvotes.api.v1.model.Poll> createPoll(CreatePoll request) {
        Poll created = commands.createDraft(request.getTitle(), Poll.TemplateGroupId.of(OpaqueIdCodec.decode("g", request.getTemplateGroupId())), admin());
        var response = PollResponseMapper.map(created);
        return ResponseEntity.status(HttpStatus.CREATED).header("Location", "/api/v1/admin/polls/" + response.getId()).body(response);
    }

    @Override
    public ResponseEntity<de.justvotes.api.v1.model.Poll> replacePollOptions(String pollId, Options request) {
        return ResponseEntity.ok(PollResponseMapper.map(commands.replaceDraftOptions(pollId(pollId), request.getOptionTexts())));
    }

    @Override
    public ResponseEntity<de.justvotes.api.v1.model.Poll> publishPoll(String pollId, Expiry request) {
        return ResponseEntity.ok(PollResponseMapper.map(commands.publish(pollId(pollId), admin(), instant(request.getEndsAt()))));
    }

    @Override
    public ResponseEntity<de.justvotes.api.v1.model.Poll> makePollPrivate(String pollId) {
        return ResponseEntity.ok(PollResponseMapper.map(commands.makePrivate(pollId(pollId))));
    }

    @Override
    public ResponseEntity<List<de.justvotes.api.v1.model.Poll>> adminPolls() {
        return ResponseEntity.ok(queries.pollsCreatedBy(admin()).stream().map(PollResponseMapper::map).toList());
    }

    @Override
    public ResponseEntity<de.justvotes.api.v1.model.Poll> archivePoll(String pollId) {
        return ResponseEntity.ok(PollResponseMapper.map(commands.archive(pollId(pollId), admin())));
    }

    @Override
    public ResponseEntity<de.justvotes.api.v1.model.Poll> restorePollFromArchive(String pollId) {
        return ResponseEntity.ok(PollResponseMapper.map(commands.restoreFromArchive(pollId(pollId), admin())));
    }

    @Override
    public ResponseEntity<de.justvotes.api.v1.model.Poll> changePollExpiry(String pollId, Expiry request) {
        return ResponseEntity.ok(PollResponseMapper.map(commands.changeExpiry(pollId(pollId), instant(request.getEndsAt()), admin())));
    }

    @Override
    public ResponseEntity<de.justvotes.api.v1.model.Poll> reopenPoll(String pollId) {
        return ResponseEntity.ok(PollResponseMapper.map(commands.reopen(pollId(pollId), java.time.Instant.now(), admin())));
    }

    @Override
    public ResponseEntity<de.justvotes.api.v1.model.Poll> deletePoll(String pollId) {
        return ResponseEntity.ok(PollResponseMapper.map(commands.softDelete(pollId(pollId), admin())));
    }

    @Override
    public ResponseEntity<de.justvotes.api.v1.model.Poll> restorePoll(String pollId) {
        return ResponseEntity.ok(PollResponseMapper.map(commands.restore(pollId(pollId), admin())));
    }

    @Override
    public ResponseEntity<Void> permanentlyDeletePoll(String pollId, DeleteConfirmation confirmation) {
        commands.permanentlyDelete(pollId(pollId), confirmation.getConfirmation() == DeleteConfirmation.ConfirmationEnum.DELETE, true);
        return ResponseEntity.noContent().build();
    }
}
