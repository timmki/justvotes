package de.justvotes.adapters.pollmanagement.infra.in.http;

import de.justvotes.adapters.shared.infra.in.http.AuthenticatedAccounts;
import de.justvotes.adapters.shared.infra.in.http.OpaqueIdCodec;
import de.justvotes.api.v1.model.CurrentIdentityVotes;
import de.justvotes.api.v1.model.Option;
import de.justvotes.api.v1.model.PersonalVote;
import de.justvotes.api.v1.model.PersonalVotePoll;
import de.justvotes.api.v1.model.PersonalVotePoll.StateEnum;
import de.justvotes.api.v1.server.IdentityApi;
import de.justvotes.pollmanagement.core.model.Identity;
import de.justvotes.pollmanagement.core.ports.in.ViewVotes;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;

@RestController
public class IdentityController implements IdentityApi {
    private final ViewVotes queries;

    public IdentityController(ViewVotes queries) {
        this.queries = queries;
    }

    @Override
    public ResponseEntity<CurrentIdentityVotes> currentIdentityVotes() {
        Identity identity = Identity.of(AuthenticatedAccounts.current().identity());
        List<PersonalVote> entries = queries.currentVotes(identity).stream().map(vote -> new PersonalVote(
                new PersonalVotePoll(OpaqueIdCodec.encode("p", vote.pollId().value()), vote.pollTitle(),
                        StateEnum.fromValue(vote.pollState().name().toLowerCase(Locale.ROOT))),
                new Option(vote.optionNumber(), vote.optionText()),
                OffsetDateTime.ofInstant(vote.votedAt(), ZoneOffset.UTC))).toList();
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(new CurrentIdentityVotes(identity.value(), entries));
    }
}
