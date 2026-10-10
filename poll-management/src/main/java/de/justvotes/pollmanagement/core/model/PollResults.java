package de.justvotes.pollmanagement.core.model;

import de.justvotes.pollmanagement.core.model.Poll.Option;
import de.justvotes.pollmanagement.core.model.Poll.PollId;
import de.justvotes.pollmanagement.core.model.Poll.State;
import de.justvotes.pollmanagement.core.model.Poll.Visibility;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;

public record PollResults(
        PollId id,
        String title,
        Visibility visibility,
        State state,
        Instant createdAt,
        Instant endsAt,
        int totalVotes,
        List<OptionResult> options) {

    public PollResults {
        options = List.copyOf(options);
    }

    public static PollResults from(Poll poll) {
        List<Vote> currentVotes = poll.votes();
        List<OptionResult> resultOptions = poll.options().stream()
                .sorted(Comparator.comparingInt(Option::number))
                .map(option -> {
                    List<VoteResult> votes = currentVotes.stream()
                            .filter(vote -> vote.optionNumber() == option.number())
                            .sorted(Comparator.comparing(vote -> vote.identity().value()))
                            .map(vote -> new VoteResult(vote.identity(), vote.votedAt()))
                            .toList();
                    return new OptionResult(option.number(), option.text(), votes.size(), votes);
                })
                .toList();
        return new PollResults(poll.id(), poll.title(), poll.visibility(), poll.state(), poll.createdAt(), poll.endsAt(), currentVotes.size(), resultOptions);
    }

    public record OptionResult(int number, String text, int voteCount, List<VoteResult> votes) {
        public OptionResult {
            votes = List.copyOf(votes);
        }
    }

    public record VoteResult(Identity identity, Instant votedAt) {
    }
}
