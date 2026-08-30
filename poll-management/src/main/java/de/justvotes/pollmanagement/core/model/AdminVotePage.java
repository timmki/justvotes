package de.justvotes.pollmanagement.core.model;

import java.util.List;

public record AdminVotePage(List<AdminVote> votes, int page, int size, long totalElements) {
    public AdminVotePage {
        if (votes == null || page < 0 || size < 1 || size > 100 || totalElements < 0) {
            throw new IllegalArgumentException("An administrative vote page has invalid paging values.");
        }
        votes = List.copyOf(votes);
    }
}
