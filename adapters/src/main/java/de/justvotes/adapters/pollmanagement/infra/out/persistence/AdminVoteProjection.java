package de.justvotes.adapters.pollmanagement.infra.out.persistence;

public interface AdminVoteProjection {
    long getVoteId();

    String getUserId();

    String getVotedAt();

    String getPollId();

    String getPollTitle();

    int getOptionNumber();

    String getOptionText();
}
