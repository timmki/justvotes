package de.justvotes.pollmanagement.core.model;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;

public record PollResults(
        Poll.PollId id,
        String title,
        Poll.Visibility visibility,
        Poll.State state,
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
                .sorted(Comparator.comparingInt(Poll.Option::number))
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
